import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PedidoService } from '../../services/pedido.service';
import {
  CATEGORIAS_PEDIDO,
  ORDEM_URGENCIA,
  PedidoNecessidade,
  UrgenciaPedido,
  CategoriaPedido,
  OrdemPedido
} from '../../models/pedido-necessidade.model';

type CategoriaFiltro = 'Todos' | CategoriaPedido;

const URGENCIA_NA_MAPA: Record<UrgenciaPedido, { rotulo: string; classes: string }> = {
  Alta: { rotulo: 'Urgência Alta', classes: 'bg-error-container text-on-error-container' },
  Média: { rotulo: 'Urgência Média', classes: 'bg-tertiary-container text-on-tertiary-container' },
  Baixa: { rotulo: 'Urgência Baixa', classes: 'bg-surface-container-high text-on-surface-variant' }
};

const ICONES_CATEGORIA: Record<CategoriaPedido, string> = {
  Alimentos: 'local_dining',
  Móveis: 'chair',
  Vestuário: 'checkroom',
  'Materiais Escolares': 'menu_book',
  Saúde: 'vaccines',
  Outros: 'category'
};

@Component({
  selector: 'app-pedidos',
  imports: [RouterLink],
  templateUrl: './pedidos.component.html',
  styleUrl: './pedidos.component.css'
})
export class PedidosComponent implements OnInit {
  private readonly pedidoService = inject(PedidoService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly pedidos = signal<PedidoNecessidade[]>([]);
  readonly isLoading = signal(true);
  readonly mensagemErro = signal('');
  readonly mensagemSucesso = signal('');

  readonly categoriaSelecionada = signal<CategoriaFiltro>('Todos');
  readonly ordemSelecionada = signal<OrdemPedido>('relevancia');

  readonly pedidoEmDetalhe = signal<PedidoNecessidade | null>(null);

  readonly categoriasFiltro: readonly CategoriaFiltro[] = ['Todos', ...CATEGORIAS_PEDIDO];

  readonly pedidosVisiveis = computed(() => {
    const categoria = this.categoriaSelecionada();
    const filtrados = categoria === 'Todos'
      ? this.pedidos()
      : this.pedidos().filter(pedido => pedido.categoria === categoria);

    return this.ordenar(filtrados, this.ordemSelecionada());
  });

  readonly totalPedidosAbertos = computed(
    () => this.pedidos().filter(pedido => pedido.status === 'Aberto').length
  );

  readonly totalItensAtendidos = computed(() =>
    this.pedidos().reduce((total, pedido) => total + pedido.quantidade_atendida, 0)
  );

  readonly totalItensSolicitados = computed(() =>
    this.pedidos().reduce((total, pedido) => total + pedido.quantidade, 0)
  );

  readonly percentualGeral = computed(() => {
    const solicitado = this.totalItensSolicitados();
    return solicitado === 0 ? 0 : Math.round((this.totalItensAtendidos() / solicitado) * 100);
  });

  readonly familiasAtendidas = computed(() => this.totalItensAtendidos());

  ngOnInit(): void {
    this.exibirConfirmacaoDePublicacao();
    this.carregarPedidos();
  }

  filtrarPorCategoria(categoria: CategoriaFiltro): void {
    this.categoriaSelecionada.set(categoria);
  }

  alterarOrdem(ordem: string): void {
    const valor = ordem as OrdemPedido;
    this.ordemSelecionada.set(['relevancia', 'urgencia', 'proximidade'].includes(valor) ? valor : 'relevancia');
  }

  abrirCriacao(categoria: CategoriaFiltro): void {
    const queryParams = categoria === 'Todos' ? {} : { categoria };
    this.router.navigate(['/pedidos/criar'], { queryParams });
  }

  verDetalhes(pedido: PedidoNecessidade): void {
    this.pedidoEmDetalhe.set(pedido);
  }

  fecharDetalhes(): void {
    this.pedidoEmDetalhe.set(null);
  }

  falarComSolicitante(idSolicitante: number): void {
    this.pedidoEmDetalhe.set(null);
    this.router.navigate(['/mensagens'], { queryParams: { com: idSolicitante } });
  }

  ehMeuPedido(pedido: PedidoNecessidade): boolean {
    return pedido.id_solicitante === this.authService.obterIdUsuario();
  }

  percentualAtendido(pedido: PedidoNecessidade): number {
    if (pedido.quantidade <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((pedido.quantidade_atendida / pedido.quantidade) * 100));
  }

  ehPedidoConcluido(pedido: PedidoNecessidade): boolean {
    return pedido.status === 'Concluído';
  }

  classeUrgencia(urgencia: UrgenciaPedido): string {
    return URGENCIA_NA_MAPA[urgencia].classes;
  }

  rotuloUrgencia(urgencia: UrgenciaPedido): string {
    return URGENCIA_NA_MAPA[urgencia].rotulo;
  }

  iconeCategoria(categoria: CategoriaPedido): string {
    return ICONES_CATEGORIA[categoria] ?? 'category';
  }

  formatarData(criadoEm: string): string {
    const data = new Date(criadoEm.replace(' ', 'T'));

    if (Number.isNaN(data.getTime())) {
      return criadoEm;
    }

    return data.toLocaleDateString('pt-BR');
  }

  ajudarNoPedido(pedido: PedidoNecessidade): void {
    if (!this.authService.obterIdUsuario()) {
      this.mensagemErro.set('Você precisa estar logado para ajudar em um pedido.');
      return;
    }

    if (this.ehMeuPedido(pedido)) {
      this.mensagemErro.set('Você não pode ajudar no seu próprio pedido.');
      return;
    }

    if (this.ehPedidoConcluido(pedido)) {
      return;
    }

    this.mensagemErro.set('');
    this.mensagemSucesso.set('');
    this.falarComSolicitante(pedido.id_solicitante);
  }

  private exibirConfirmacaoDePublicacao(): void {
    if (this.route.snapshot.queryParamMap.get('publicado') !== '1') {
      return;
    }

    this.mensagemSucesso.set('Pedido publicado! Agora é só esperar pela rede de apoio.');

    const categoria = this.route.snapshot.queryParamMap.get('categoria') as CategoriaFiltro | null;
    if (categoria && this.categoriasFiltro.includes(categoria)) {
      this.categoriaSelecionada.set(categoria);
    }
  }

  private carregarPedidos(): void {
    this.isLoading.set(true);

    this.pedidoService.listarPedidos().subscribe({
      next: pedidos => {
        this.pedidos.set(pedidos);
        this.isLoading.set(false);
      },
      error: (erro) => {
        console.error('Erro ao buscar pedidos:', erro);
        this.mensagemErro.set('Não foi possível carregar os pedidos.');
        this.isLoading.set(false);
      }
    });
  }

  private ordenar(pedidos: PedidoNecessidade[], ordem: OrdemPedido): PedidoNecessidade[] {
    const ordenados = [...pedidos];

    if (ordem === 'urgencia') {
      return ordenados.sort(
        (a, b) => ORDEM_URGENCIA[b.urgencia] - ORDEM_URGENCIA[a.urgencia] || b.criado_em.localeCompare(a.criado_em)
      );
    }

    if (ordem === 'proximidade') {
      const meuEstado = this.estadoDoUsuario();
      return ordenados.sort((a, b) => this.pesoDeProximidade(b, meuEstado) - this.pesoDeProximidade(a, meuEstado));
    }

    return ordenados.sort((a, b) => this.pesoDeRelevancia(b) - this.pesoDeRelevancia(a));
  }

  private pesoDeRelevancia(pedido: PedidoNecessidade): number {
    const pesoUrgencia = ORDEM_URGENCIA[pedido.urgencia] * 10;
    const pesoProgresso = this.percentualAtendido(pedido);
    return pesoUrgencia + pesoProgresso;
  }

  private pesoDeProximidade(pedido: PedidoNecessidade, meuEstado: string | null): number {
    if (!meuEstado) {
      return 0;
    }

    return pedido.estado.toUpperCase() === meuEstado ? 1 : 0;
  }

  private estadoDoUsuario(): string | null {
    const endereco = this.authService.obterUsuarioLogado()?.endereco;

    if (!endereco) {
      return null;
    }

    const partes = endereco.split(',');
    return partes.length > 1 ? partes[partes.length - 1].trim().toUpperCase() : null;
  }
}
