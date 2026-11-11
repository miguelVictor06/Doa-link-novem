import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DoacaoService } from '../../services/doacao.service';
import { Usuario } from '../../models/usuario.model';
import { ItemDoacao } from '../../models/item-doacao.model';

@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  usuarioLogado = signal<Usuario | null>(null);
  minhasDoacoes = signal<ItemDoacao[]>([]);
  isLoading = signal(true);
  modoEdicao = signal(false);
  salvandoPerfil = signal(false);
  mensagemErro = signal('');
  mensagemSucesso = signal('');

  readonly formularioPerfil: FormGroup;

  constructor(
    private readonly authService: AuthService,
    private readonly doacaoService: DoacaoService,
    private readonly router: Router,
    private readonly formBuilder: FormBuilder
  ) {
    this.formularioPerfil = this.formBuilder.group({
      nome: ['', [Validators.required, Validators.maxLength(120)]],
      email: ['', [Validators.required, Validators.email]],
      endereco: ['', [Validators.required, Validators.maxLength(200)]]
    });
  }

  ngOnInit(): void {
    this.usuarioLogado.set(this.authService.obterUsuarioLogado());
    this.carregarHistorico();
  }

  iniciarEdicaoPerfil(): void {
    this.mensagemErro.set('');
    this.mensagemSucesso.set('');
    this.formularioPerfil.reset({
      nome: this.usuarioLogado()?.nome ?? '',
      email: this.usuarioLogado()?.email ?? '',
      endereco: this.usuarioLogado()?.endereco ?? ''
    });
    this.modoEdicao.set(true);
  }

  cancelarEdicaoPerfil(): void {
    this.modoEdicao.set(false);
    this.formularioPerfil.reset();
  }

  salvarPerfil(): void {
    this.mensagemErro.set('');
    this.mensagemSucesso.set('');

    if (this.formularioPerfil.invalid) {
      this.formularioPerfil.markAllAsTouched();
      return;
    }

    const idUsuario = this.authService.obterIdUsuario();

    if (!idUsuario) {
      this.mensagemErro.set('Usuário não identificado.');
      return;
    }

    this.salvandoPerfil.set(true);

    this.authService.atualizarPerfil(idUsuario, {
      nome: String(this.formularioPerfil.value.nome).trim(),
      email: String(this.formularioPerfil.value.email).trim(),
      endereco: String(this.formularioPerfil.value.endereco).trim()
    }).subscribe({
      next: (usuario) => {
        this.usuarioLogado.set(usuario);
        this.modoEdicao.set(false);
        this.salvandoPerfil.set(false);
        this.mensagemSucesso.set('Perfil atualizado com sucesso.');
      },
      error: (erro) => {
        console.error('Erro ao atualizar perfil:', erro);
        this.salvandoPerfil.set(false);
        this.mensagemErro.set(erro?.error?.erro ?? 'Não foi possível atualizar o perfil.');
      }
    });
  }

  obterErroPerfil(nomeCampo: string): string {
    const controle = this.formularioPerfil.get(nomeCampo);
    if (!controle?.errors || !controle.touched) {
      return '';
    }
    if (controle.errors['required']) return 'Este campo é obrigatório.';
    if (controle.errors['email']) return 'Email inválido.';
    if (controle.errors['maxlength']) return 'Texto muito longo.';
    return '';
  }

  editarDoacao(idItem: number): void {
    this.router.navigate(['/postar'], { queryParams: { editId: idItem } });
  }

  excluirDoacao(idItem: number): void {
    this.mensagemErro.set('');
    this.mensagemSucesso.set('');

    const confirmado = window.confirm(
      'Tem certeza de que deseja encerrar esta doação? Ela será removida do Hub e não poderá ser recuperada.'
    );

    if (!confirmado) {
      return;
    }

    this.doacaoService.excluirDoacao(idItem).subscribe({
      next: () => {
        this.removerItemDaLista(idItem);
        this.mensagemSucesso.set('Doação encerrada com sucesso.');
      },
      error: (erro) => {
        console.error('Erro ao excluir doação:', erro);
        this.mensagemErro.set(erro?.error?.erro ?? 'Não foi possível encerrar a doação.');
      }
    });
  }

  private carregarHistorico(): void {
    this.isLoading.set(true);
    const idUsuario = this.authService.obterIdUsuario();

    if (!idUsuario) {
      this.mensagemErro.set('Usuário não identificado.');
      this.isLoading.set(false);
      return;
    }

    this.doacaoService.buscarHistoricoUsuario(idUsuario).subscribe({
      next: (itens) => {
        this.minhasDoacoes.set(itens);
        this.isLoading.set(false);
      },
      error: (erro) => {
        console.error('Erro ao buscar histórico:', erro);
        this.mensagemErro.set('Não foi possível carregar o histórico.');
        this.isLoading.set(false);
      }
    });
  }

  private removerItemDaLista(idItem: number): void {
    this.minhasDoacoes.update(itens => itens.filter(item => item.id_item !== idItem));
  }
}
