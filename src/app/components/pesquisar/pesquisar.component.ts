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

  public readonly doacoesDisponiveis = signal<readonly ItemDoacao[]>([]);

  public readonly resultados = computed(() => this.filtrarDoacoes(this.termoPesquisa()));

  public readonly mensagemVazia = computed(() => this.escolherMensagemVazia(this.termoPesquisa()));

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

    this.doacaoService.solicitarItem(idItem).subscribe({
      next: () => this.removerDaLista(idItem),
      error: () => this.mensagemErro.set('Não foi possível solicitar este item. Tente novamente.')
    });
  }

  private carregarDoacoes(): void {
    this.isLoading.set(true);

    this.doacaoService.buscarDoacoesDisponiveis().subscribe({
      next: (itens) => {
        this.doacoesDisponiveis.set(this.filtrarItensProprios(itens));
        this.isLoading.set(false);
      },
      error: () => {
        this.mensagemErro.set('Não foi possível carregar as doações.');
        this.isLoading.set(false);
      }
    });
  }

  private filtrarItensProprios(itens: ItemDoacao[]): ItemDoacao[] {
    const idUsuario = this.authService.obterIdUsuario();

    if (!idUsuario) return itens;

    return itens.filter(item => item.id_doador !== idUsuario);
  }

  private filtrarDoacoes(termo: string): readonly ItemDoacao[] {
    const termoNormalizado = termo.trim().toLowerCase();

    if (!termoNormalizado) return this.doacoesDisponiveis();

    return this.doacoesDisponiveis().filter(item => this.itemCorresponde(item, termoNormalizado));
  }

  private itemCorresponde(item: ItemDoacao, termo: string): boolean {
    return item.titulo.toLowerCase().includes(termo) || item.descricao.toLowerCase().includes(termo);
  }

  private escolherMensagemVazia(termo: string): string {
    const termoNormalizado = termo.trim();

    if (!termoNormalizado) return 'Nenhuma doação disponível no momento.';

    return `Nenhum resultado encontrado para "${termoNormalizado}".`;
  }

  private removerDaLista(idItem: number): void {
    this.doacoesDisponiveis.update(itens => itens.filter(item => item.id_item !== idItem));
  }
}
