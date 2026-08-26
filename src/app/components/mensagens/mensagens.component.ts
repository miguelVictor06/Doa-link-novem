import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
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

@Component({
  selector: 'app-mensagens',
  imports: [FormsModule],
  templateUrl: './mensagens.component.html',
  styleUrl: './mensagens.component.css'
})
export class MensagensComponent implements OnInit {
  @ViewChild('areaMensagens') private areaMensagens?: ElementRef<HTMLDivElement>;

  private readonly authService = inject(AuthService);
  private readonly mensagemService = inject(MensagemService);

  private readonly contatos = signal<UsuarioContato[]>([]);
  private readonly mensagens = signal<Mensagem[]>([]);

  readonly carregando = signal(true);
  readonly enviando = signal(false);
  readonly mensagemErro = signal('');
  readonly idSelecionado = signal<number | null>(null);

  textoNovaMensagem = '';

  readonly conversas = computed<ConversaResumo[]>(() => {
    const idUsuario = this.authService.obterIdUsuario();
    if (!idUsuario) return [];

    const resumos = this.contatos().map(contato => {
      const daConversa = this.mensagens().filter(
        mensagem =>
          (mensagem.id_remetente === contato.id_usuario && mensagem.id_destinatario === idUsuario) ||
          (mensagem.id_remetente === idUsuario && mensagem.id_destinatario === contato.id_usuario)
      );
      const ordenadas = [...daConversa].sort((a, b) => a.id_mensagem - b.id_mensagem);
      return {
        idOutro: contato.id_usuario,
        nome: contato.nome,
        endereco: contato.endereco,
        ultima: ordenadas.length > 0 ? ordenadas[ordenadas.length - 1] : null,
        naoLidas: ordenadas.filter(m => m.id_destinatario === idUsuario && !m.lida).length
      };
    });

    return resumos.sort((a, b) => {
      if (a.ultima && b.ultima) return b.ultima.id_mensagem - a.ultima.id_mensagem;
      if (a.ultima) return -1;
      if (b.ultima) return 1;
      return a.nome.localeCompare(b.nome);
    });
  });

  readonly conversaAberta = computed(
    () => this.conversas().find(conversa => conversa.idOutro === this.idSelecionado()) ?? null
  );

  readonly mensagensDaConversa = computed(() => {
    const id = this.idSelecionado();
    const idUsuario = this.authService.obterIdUsuario();
    if (id === null || idUsuario === null) return [];

    return this.mensagens().filter(
      mensagem =>
        (mensagem.id_remetente === id && mensagem.id_destinatario === idUsuario) ||
        (mensagem.id_remetente === idUsuario && mensagem.id_destinatario === id)
    );
  });

  ngOnInit(): void {
    this.carregarDados();
  }

  selecionarConversa(conversa: ConversaResumo): void {
    this.idSelecionado.set(conversa.idOutro);
    if (conversa.naoLidas > 0) {
      this.marcarComoLidas(conversa.idOutro);
    }
    setTimeout(() => this.rolarParaOFim());
  }

  voltarParaLista(): void {
    this.idSelecionado.set(null);
  }

  enviar(): void {
    const texto = this.textoNovaMensagem.trim();
    const idRemetente = this.authService.obterIdUsuario();
    const idDestinatario = this.idSelecionado();

    if (!texto || idRemetente === null || idDestinatario === null || this.enviando()) {
      return;
    }

    this.enviando.set(true);
    this.mensagemErro.set('');

    this.mensagemService
      .enviarMensagem({ id_remetente: idRemetente, id_destinatario: idDestinatario, texto })
      .subscribe({
        next: mensagem => {
          this.mensagens.update(atuais => [...atuais, mensagem]);
          this.textoNovaMensagem = '';
          this.enviando.set(false);
          setTimeout(() => this.rolarParaOFim());
        },
        error: () => {
          this.enviando.set(false);
          this.mensagemErro.set('Não foi possível enviar a mensagem.');
        }
      });
  }

  formatarHorario(criadoEm: string): string {
    const data = new Date(criadoEm.replace(' ', 'T'));
    if (Number.isNaN(data.getTime())) return '';
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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

    forkJoin({
      contatos: this.mensagemService.listarUsuarios(),
      mensagens: this.mensagemService.buscarMensagens(idUsuario)
    }).subscribe({
      next: ({ contatos, mensagens }) => {
        this.contatos.set(contatos.filter(contato => contato.id_usuario !== idUsuario));
        this.mensagens.set(mensagens);
        this.mensagemService.recalcularNaoLidas(mensagens, idUsuario);
        this.carregando.set(false);
      },
      error: () => {
        this.mensagemErro.set('Não foi possível carregar as mensagens.');
        this.carregando.set(false);
      }
    });
  }

  private marcarComoLidas(idOutro: number): void {
    const idUsuario = this.authService.obterIdUsuario();
    if (!idUsuario) return;

    this.mensagemService.marcarConversaComoLida(idUsuario, idOutro).subscribe({
      next: () => {
        this.mensagens.update(atuais =>
          atuais.map(mensagem =>
            mensagem.id_remetente === idOutro && mensagem.id_destinatario === idUsuario
              ? { ...mensagem, lida: 1 }
              : mensagem
          )
        );
        this.mensagemService.recalcularNaoLidas(this.mensagens(), idUsuario);
      },
      error: () => {}
    });
  }

  private rolarParaOFim(): void {
    const elemento = this.areaMensagens?.nativeElement;
    if (elemento) {
      elemento.scrollTop = elemento.scrollHeight;
    }
  }
}
