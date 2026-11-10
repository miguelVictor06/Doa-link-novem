import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PedidoService } from '../../services/pedido.service';
import {
  CATEGORIAS_PEDIDO,
  CategoriaPedido,
  UrgenciaPedido
} from '../../models/pedido-necessidade.model';

const LIMITE_DESCRICAO = 800;

@Component({
  selector: 'app-criacao-pedido',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './criacao-pedido.component.html',
  styleUrl: './criacao-pedido.component.css'
})
export class CriacaoPedidoComponent implements OnInit {
  private readonly pedidoService = inject(PedidoService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);

  readonly categorias = CATEGORIAS_PEDIDO;
  readonly urgencias: readonly UrgenciaPedido[] = ['Baixa', 'Média', 'Alta'];
  readonly limiteDescricao = LIMITE_DESCRICAO;

  readonly categoriaPreSelecionada = signal<CategoriaPedido | null>(null);
  readonly isSubmitting = signal(false);
  readonly mensagemErro = signal('');
  readonly redirecionando = signal(false);

  readonly formularioPedido: FormGroup;

  readonly caracteresUsados = signal(0);
  readonly caracteresRestantes = computed(() => LIMITE_DESCRICAO - this.caracteresUsados());
  readonly descricaoNoLimite = computed(() => this.caracteresUsados() >= LIMITE_DESCRICAO);

  constructor() {
    this.formularioPedido = this.formBuilder.group({
      titulo: ['', [Validators.required, Validators.maxLength(120)]],
      categoria: ['', Validators.required],
      urgencia: ['Média', Validators.required],
      cidade: ['', Validators.required],
      quantidade: [1, [Validators.required, Validators.min(1)]],
      descricao: ['', [Validators.required, Validators.maxLength(LIMITE_DESCRICAO)]],
      telefone: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    this.aplicarCategoriaDaUrl();
    this.observarContadorDeCaracteres();
  }

  obterErroCampo(nomeCampo: string): string {
    const controle = this.formularioPedido.get(nomeCampo);

    if (!controle?.errors || !controle.touched) {
      return '';
    }

    if (controle.errors['required']) {
      return 'Este campo é obrigatório.';
    }

    if (controle.errors['minlength']) {
      return 'Telefone muito curto.';
    }

    if (controle.errors['min']) {
      return 'Informe ao menos 1.';
    }

    if (controle.errors['maxlength']) {
      return `Limite de ${this.limiteDescricao} caracteres.`;
    }

    return '';
  }

  publicarPedido(): void {
    this.mensagemErro.set('');

    if (this.formularioPedido.invalid) {
      this.formularioPedido.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const dados = this.formularioPedido.getRawValue();

    this.pedidoService
      .cadastrarPedido({
        titulo: String(dados.titulo).trim(),
        categoria: dados.categoria,
        urgencia: dados.urgencia,
        cidade: String(dados.cidade).trim(),
        estado: '',
        descricao: String(dados.descricao).trim(),
        telefone: String(dados.telefone).trim(),
        quantidade: Number(dados.quantidade)
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.mensagemSucesso();
        },
        error: (erro) => {
          console.error('Erro ao publicar pedido:', erro);
          this.isSubmitting.set(false);
          this.mensagemErro.set(erro?.error?.erro ?? 'Não foi possível publicar o pedido. Tente novamente.');
        }
      });
  }

  private mensagemSucesso(): void {
    this.redirecionando.set(true);
    this.router.navigate(['/pedidos'], { queryParams: { publicado: '1' } });
  }

  private aplicarCategoriaDaUrl(): void {
    const pedida = this.route.snapshot.queryParamMap.get('categoria') as CategoriaPedido | null;

    if (pedida && this.categorias.includes(pedida)) {
      this.categoriaPreSelecionada.set(pedida);
      this.formularioPedido.patchValue({ categoria: pedida });
    }
  }

  private observarContadorDeCaracteres(): void {
    const descricao = this.formularioPedido.get('descricao');
    descricao?.valueChanges.subscribe((valor: string) => this.caracteresUsados.set(valor?.length ?? 0));
  }
}
