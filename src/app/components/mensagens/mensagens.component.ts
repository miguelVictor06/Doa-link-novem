import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { MensagemService } from '../../services/mensagem.service';
import { Mensagem, UsuarioContato } from '../../models/mensagem.model';

interface ConversaResumo {
  idOutro: number;
  nome: string;
  endereco: string;
  ultima: Mensagem | null;
  naoLidas: number;
}

const INTERVALO_ATUALIZACAO_MS = 2500;

@Component({
  selector: 'app-mensagens',
  imports: [FormsModule],
  templateUrl: './mensagens.component.html',
  styleUrl: './mensagens.component.css'
})
export class MensagensComponent implements OnInit, OnDestroy {
  @ViewChild('areaMensagens') private areaMensagens?: ElementRef<HTMLDivElement>;

  private readonly authService = inject(AuthService);
  private readonly mensagemService = inject(MensagemService);
  private readonly rotaAtiva = inject(ActivatedRoute);

  private readonly contatos = signal<UsuarioContato[]>([]);
  private readonly mensagens = signal<Mensagem[]>([]);
  private readonly marcandoComoLidas = new Set<number>();

  private intervaloAtualizacao: ReturnType<typeof setInterval> | null = null;
  private atualizandoMensagens = false;

  readonly carregando = signal(true);
  readonly enviando = signal(false);
  readonly mensagemErro = signal('');
  readonly erroEnvio = signal('');
  readonly idSelecionado = signal<number | null>(null);
  readonly seletorContatosAberto = signal(false);

  textoNovaMensagem = '';

  readonly contatosDisponiveis = computed(() => {
    const idUsuario = this.authService.obterIdUsuario();

    return this.contatos()
      .filter(contato => contato.id_usuario !== idUsuario)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  });

  readonly conversas = computed<ConversaResumo[]>(() => {
    const idUsuario = this.authService.obterIdUsuario();
    if (!idUsuario) return [];

    const resumos = this.contatosDisponiveis()
      .map(contato => this.resumoConversa(contato, idUsuario))
      .filter(conversa => conversa.ultima !== null);

    return resumos.sort((a, b) => {
      const porData = compararMensagens(b.ultima!, a.ultima!);
      return porData !== 0 ? porData : a.nome.localeCompare(b.nome, 'pt-BR');
    });
  });

  readonly contatosSemConversa = computed(() => {
    const comHistorico = new Set(this.conversas().map(conversa => conversa.idOutro));
    return this.contatosDisponiveis().filter(contato => !comHistorico.has(contato.id_usuario));
  });

  readonly conversaAberta = computed<ConversaResumo | null>(() => {
    const id = this.idSelecionado();
    const idUsuario = this.authService.obterIdUsuario();

    if (id === null || !idUsuario) return null;

    const contato = this.contatosDisponiveis().find(item => item.id_usuario === id);
    return contato ? this.resumoConversa(contato, idUsuario) : null;
  });

  readonly mensagensDaConversa = computed(() => {
    const id = this.idSelecionado();
    const idUsuario = this.authService.obterIdUsuario();
    if (id === null || !idUsuario) return [];

    return this.mensagens()
      .filter(
        mensagem =>
          (mensagem.id_remetente === id && mensagem.id_destinatario === idUsuario) ||
          (mensagem.id_remetente === idUsuario && mensagem.id_destinatario === id)
      )
      .sort(compararMensagens);
  });

  ngOnInit(): void {
    this.carregarDados();
  }

  ngOnDestroy(): void {
    this.pararAtualizacaoAutomatica();
  }

  selecionarConversa(conversa: ConversaResumo): void {
    this.selecionarContato(conversa.idOutro);
  }

  selecionarContato(idOutro: number): void {
    this.idSelecionado.set(idOutro);
    this.seletorContatosAberto.set(false);
    this.erroEnvio.set('');
    this.marcarComoLidas(idOutro);
    setTimeout(() => this.rolarParaOFim(true));
  }

  voltarParaLista(): void {
    this.idSelecionado.set(null);
    this.seletorContatosAberto.set(false);
    this.erroEnvio.set('');
  }

  alternarSeletorContatos(): void {
    this.seletorContatosAberto.update(aberto => !aberto);
  }

  enviar(): void {
    const texto = this.textoNovaMensagem.trim();
    const idRemetente = this.authService.obterIdUsuario();
    const idDestinatario = this.idSelecionado();

    if (!texto || idRemetente === null || idDestinatario === null || this.enviando()) {
      return;
    }

    this.enviando.set(true);
    this.erroEnvio.set('');
    this.mensagemErro.set('');

    this.mensagemService
      .enviarMensagem({ id_destinatario: idDestinatario, texto })
      .subscribe({
        next: mensagem => {
          this.mensagens.update(atuais => this.mesclarMensagens(atuais, [mensagem]));
          this.textoNovaMensagem = '';
          this.enviando.set(false);
          this.atualizarContadorNaoLidas();
          setTimeout(() => this.rolarParaOFim(true));
        },
        error: () => {
          this.enviando.set(false);
          this.erroEnvio.set('Não foi possível enviar a mensagem. Tente novamente.');
        }
      });
  }

  aoPressionarEnter(evento: Event): void {
    const teclado = evento as KeyboardEvent;

    if (teclado.shiftKey || teclado.isComposing) {
      return;
    }

    evento.preventDefault();
    this.enviar();
  }

  formatarHorario(criadoEm: string): string {
    const data = this.paraData(criadoEm);
    if (!data) return '';

    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  formatarDataHora(criadoEm: string): string {
    const data = this.paraData(criadoEm);
    if (!data) return '';

    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatarPreviaHorario(criadoEm: string): string {
    const data = this.paraData(criadoEm);
    if (!data) return '';

    const hoje = new Date();

    if (mesmoDia(data, hoje)) {
      return this.formatarHorario(criadoEm);
    }

    if (data.getFullYear() === hoje.getFullYear()) {
      return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }

    return data.toLocaleDateString('pt-BR');
  }

  ehMinha(mensagem: Mensagem): boolean {
    return mensagem.id_remetente === this.authService.obterIdUsuario();
  }

  private carregarDados(): void {
    const idUsuario = this.authService.obterIdUsuario();

    if (!idUsuario) {
      this.mensagemErro.set('Usuário não identificado.');
      this.carregando.set(false);
      return;
    }

    this.mensagemErro.set('');

    forkJoin({
      contatos: this.mensagemService.listarUsuarios(),
      mensagens: this.mensagemService.buscarMensagens(idUsuario)
    }).subscribe({
      next: ({ contatos, mensagens }) => {
        this.contatos.set(contatos);
        this.mensagens.set([...mensagens].sort(compararMensagens));
        this.atualizarContadorNaoLidas();
        this.carregando.set(false);
        this.selecionarContatoDoQueryParam();
        this.iniciarAtualizacaoAutomatica();
      },
      error: () => {
        this.mensagemErro.set('Não foi possível carregar as mensagens.');
        this.carregando.set(false);
        this.iniciarAtualizacaoAutomatica();
      }
    });
  }

  private iniciarAtualizacaoAutomatica(): void {
    this.pararAtualizacaoAutomatica();

    this.intervaloAtualizacao = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      this.atualizarMensagens();
    }, INTERVALO_ATUALIZACAO_MS);
  }

  private pararAtualizacaoAutomatica(): void {
    if (this.intervaloAtualizacao !== null) {
      clearInterval(this.intervaloAtualizacao);
      this.intervaloAtualizacao = null;
    }
  }

  private atualizarMensagens(mostrarErro = false): void {
    const idUsuario = this.authService.obterIdUsuario();

    if (!idUsuario || this.atualizandoMensagens) return;

    this.atualizandoMensagens = true;

    const contatos$ = this.contatos().length > 0
      ? of(this.contatos())
      : this.mensagemService.listarUsuarios();

    forkJoin({
      contatos: contatos$,
      mensagens: this.mensagemService.buscarMensagens(idUsuario)
    }).subscribe({
      next: ({ contatos, mensagens }) => {
        this.atualizandoMensagens = false;
        this.contatos.set(contatos);
        this.mensagemErro.set('');
        this.aplicarMensagens(mensagens, idUsuario);
      },
      error: () => {
        this.atualizandoMensagens = false;
        if (mostrarErro) {
          this.mensagemErro.set('Não foi possível atualizar as mensagens.');
        }
      }
    });
  }

  private aplicarMensagens(mensagensRecebidas: Mensagem[], idUsuario: number): void {
    const mensagensLocais = this.mensagens();
    const idsAtuais = new Set(mensagensLocais.map(mensagem => mensagem.id_mensagem));
    const novas = mensagensRecebidas.filter(mensagem => !idsAtuais.has(mensagem.id_mensagem));
    const porId = new Map<number, Mensagem>();

    for (const mensagem of mensagensLocais) {
      porId.set(mensagem.id_mensagem, mensagem);
    }

    for (const mensagem of mensagensRecebidas) {
      const local = porId.get(mensagem.id_mensagem);
      porId.set(mensagem.id_mensagem, local?.lida ? { ...mensagem, lida: true } : mensagem);
    }

    const ordenadas = [...porId.values()].sort(compararMensagens);
    const idAberto = this.idSelecionado();
    const novasNaConversaAberta = idAberto !== null && novas.some(
      mensagem =>
        (mensagem.id_remetente === idAberto && mensagem.id_destinatario === idUsuario) ||
        (mensagem.id_remetente === idUsuario && mensagem.id_destinatario === idAberto)
    );
    const deveRolar = this.estaPertoDoFim();

    this.mensagens.set(ordenadas);
    this.atualizarContadorNaoLidas();

    if (idAberto !== null) {
      this.marcarComoLidas(idAberto);
    }

    if (novasNaConversaAberta && deveRolar) {
      setTimeout(() => this.rolarParaOFim(true));
    }
  }

  private marcarComoLidas(idOutro: number): void {
    const idUsuario = this.authService.obterIdUsuario();

    if (!idUsuario || this.marcandoComoLidas.has(idOutro)) return;
    if (!this.temNaoLidasDaConversa(idOutro, idUsuario)) return;

    const idsNaoLidas = new Set(
      this.mensagens()
        .filter(
          mensagem =>
            mensagem.id_remetente === idOutro &&
            mensagem.id_destinatario === idUsuario &&
            !mensagem.lida
        )
        .map(mensagem => mensagem.id_mensagem)
    );

    this.marcandoComoLidas.add(idOutro);

    this.mensagemService.marcarConversaComoLida(idOutro).subscribe({
      next: () => {
        this.mensagens.update(atuais =>
          atuais.map(mensagem =>
            idsNaoLidas.has(mensagem.id_mensagem) ? { ...mensagem, lida: true } : mensagem
          )
        );
        this.atualizarContadorNaoLidas();
        this.marcandoComoLidas.delete(idOutro);
      },
      error: () => {
        this.marcandoComoLidas.delete(idOutro);
      }
    });
  }

  private atualizarContadorNaoLidas(): void {
    const idUsuario = this.authService.obterIdUsuario();
    if (idUsuario) {
      this.mensagemService.recalcularNaoLidas(this.mensagens(), idUsuario);
    }
  }

  private temNaoLidasDaConversa(idOutro: number, idUsuario: number): boolean {
    return this.mensagens().some(
      mensagem =>
        mensagem.id_remetente === idOutro &&
        mensagem.id_destinatario === idUsuario &&
        !mensagem.lida
    );
  }

  private resumoConversa(contato: UsuarioContato, idUsuario: number): ConversaResumo {
    const daConversa = this.mensagens()
      .filter(
        mensagem =>
          (mensagem.id_remetente === contato.id_usuario && mensagem.id_destinatario === idUsuario) ||
          (mensagem.id_remetente === idUsuario && mensagem.id_destinatario === contato.id_usuario)
      )
      .sort(compararMensagens);

    return {
      idOutro: contato.id_usuario,
      nome: contato.nome,
      endereco: contato.endereco,
      ultima: daConversa.length > 0 ? daConversa[daConversa.length - 1] : null,
      naoLidas: daConversa.filter(
        mensagem => mensagem.id_destinatario === idUsuario && !mensagem.lida
      ).length
    };
  }

  private mesclarMensagens(atuais: Mensagem[], novas: Mensagem[]): Mensagem[] {
    const porId = new Map<number, Mensagem>();

    for (const mensagem of [...atuais, ...novas]) {
      porId.set(mensagem.id_mensagem, mensagem);
    }

    return [...porId.values()].sort(compararMensagens);
  }

  private estaPertoDoFim(): boolean {
    const elemento = this.areaMensagens?.nativeElement;
    if (!elemento) return true;

    return elemento.scrollHeight - elemento.scrollTop - elemento.clientHeight < 80;
  }

  private rolarParaOFim(forcar = false): void {
    const elemento = this.areaMensagens?.nativeElement;
    if (!elemento) return;

    if (forcar || this.estaPertoDoFim()) {
      elemento.scrollTop = elemento.scrollHeight;
    }
  }

  private selecionarContatoDoQueryParam(): void {
    const id = Number(this.rotaAtiva.snapshot.queryParamMap.get('com'));

    if (!Number.isInteger(id) || id <= 0) return;
    if (!this.contatosDisponiveis().some(contato => contato.id_usuario === id)) return;

    this.selecionarContato(id);
  }

  private paraData(criadoEm: string): Date | null {
    if (!criadoEm) return null;

    const texto = criadoEm.includes('T') ? criadoEm : criadoEm.replace(' ', 'T');
    const temFusoHorario = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(texto);
    const data = new Date(temFusoHorario ? texto : `${texto}Z`);

    return Number.isNaN(data.getTime()) ? null : data;
  }
}

function compararMensagens(a: Mensagem, b: Mensagem): number {
  const porData = a.criado_em.localeCompare(b.criado_em);
  return porData !== 0 ? porData : a.id_mensagem - b.id_mensagem;
}

function mesmoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}
