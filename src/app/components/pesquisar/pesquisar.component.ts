
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { DoacaoService } from '../../services/doacao.service';
import { ItemDoacao } from '../../models/item-doacao.model';

@Component({
  selector: 'app-pesquisar',
  imports: [],
  templateUrl: './pesquisar.component.html',
  styleUrl: './pesquisar.component.css'
})
export class PesquisarComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly doacaoService = inject(DoacaoService);

  public readonly termoPesquisa = signal('');
  public readonly isLoading = signal(true);
  public readonly mensagemErro = signal('');
  public readonly mensagemSucesso = signal('');

  public readonly doacoesDisponiveis = signal<readonly ItemDoacao[]>([]);

  public readonly resultados = computed(() =>
    this.filtrarDoacoes(this.termoPesquisa())
  );

  public readonly mensagemVazia = computed(() =>
    this.escolherMensagemVazia(this.termoPesquisa())
  );

  ngOnInit(): void {
    this.carregarDoacoes();
  }

  public aoDigitar(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    this.termoPesquisa.set(campo.value);
  }

  public limparPesquisa(): void {
    this.termoPesquisa.set('');
  }

  public solicitarItem(idItem: number): void {
    this.mensagemErro.set('');
    this.mensagemSucesso.set('');

    const idReceptor = this.authService.obterIdUsuario();

    if (!idReceptor) {
      this.mensagemErro.set(
        'Você precisa estar logado para solicitar um item.'
      );
      return;
    }

    const doacao = this.doacoesDisponiveis().find(
      item => item.id_item === idItem
    );

    if (!doacao) {
      this.mensagemErro.set('Esta doação não está disponível.');
      return;
    }

    if (Number(doacao.id_doador) === Number(idReceptor)) {
      this.mensagemErro.set(
        'Você não pode solicitar uma doação publicada pela sua própria conta.'
      );
      return;
    }

    this.doacaoService.solicitarItem(idItem).subscribe({
      next: () => {
        this.mensagemSucesso.set(
          'Solicitação registrada! O item continua disponível para outras pessoas.'
        );
      },
      error: (erro) => {
        console.error('Erro ao solicitar item:', erro);

        this.mensagemErro.set(
          erro?.error?.erro ??
          'Não foi possível solicitar este item. Tente novamente.'
        );
      }
    });
  }

  private carregarDoacoes(): void {
    this.isLoading.set(true);
    this.mensagemErro.set('');
    this.mensagemSucesso.set('');

    this.doacaoService.buscarDoacoesDisponiveis().subscribe({
      next: (itens) => {
        this.doacoesDisponiveis.set(itens);
        this.isLoading.set(false);
      },
      error: (erro) => {
        console.error('Erro ao carregar doações:', erro);

        this.mensagemErro.set(
          'Não foi possível carregar as doações.'
        );

        this.isLoading.set(false);
      }
    });
  }

  private filtrarDoacoes(termo: string): readonly ItemDoacao[] {
    const termoNormalizado = termo.trim().toLowerCase();

    if (!termoNormalizado) {
      return this.doacoesDisponiveis();
    }

    return this.doacoesDisponiveis().filter(item =>
      this.itemCorresponde(item, termoNormalizado)
    );
  }

  private itemCorresponde(item: ItemDoacao, termo: string): boolean {
    const titulo = (item.titulo ?? '').toLowerCase();
    const descricao = (item.descricao ?? '').toLowerCase();

    return titulo.includes(termo) || descricao.includes(termo);
  }

  private escolherMensagemVazia(termo: string): string {
    const termoNormalizado = termo.trim();

    if (!termoNormalizado) {
      return 'Nenhuma doação disponível no momento.';
    }

    return `Nenhum resultado encontrado para "${termoNormalizado}".`;
  }
}
