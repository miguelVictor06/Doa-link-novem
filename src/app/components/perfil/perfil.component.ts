import { Component, OnInit } from '@angular/core';
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
  usuarioLogado: Usuario | null = null;
  minhasDoacoes: ItemDoacao[] = [];
  isLoading = true;
  modoEdicao = false;
  salvandoPerfil = false;
  mensagemErro = '';
  mensagemSucesso = '';

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
    this.usuarioLogado = this.authService.obterUsuarioLogado();
    this.carregarHistorico();
  }

  iniciarEdicaoPerfil(): void {
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    this.formularioPerfil.reset({
      nome: this.usuarioLogado?.nome ?? '',
      email: this.usuarioLogado?.email ?? '',
      endereco: this.usuarioLogado?.endereco ?? ''
    });
    this.modoEdicao = true;
  }

  cancelarEdicaoPerfil(): void {
    this.modoEdicao = false;
    this.formularioPerfil.reset();
  }

  salvarPerfil(): void {
    this.mensagemErro = '';
    this.mensagemSucesso = '';

    if (this.formularioPerfil.invalid) {
      this.formularioPerfil.markAllAsTouched();
      return;
    }

    const idUsuario = this.authService.obterIdUsuario();

    if (!idUsuario) {
      this.mensagemErro = 'Usuário não identificado.';
      return;
    }

    this.salvandoPerfil = true;

    this.authService.atualizarPerfil(idUsuario, {
      nome: String(this.formularioPerfil.value.nome).trim(),
      email: String(this.formularioPerfil.value.email).trim(),
      endereco: String(this.formularioPerfil.value.endereco).trim()
    }).subscribe({
      next: (usuario) => {
        this.usuarioLogado = usuario;
        this.modoEdicao = false;
        this.salvandoPerfil = false;
        this.mensagemSucesso = 'Perfil atualizado com sucesso.';
      },
      error: (erro) => {
        console.error('Erro ao atualizar perfil:', erro);
        this.salvandoPerfil = false;
        this.mensagemErro = erro?.error?.erro ?? 'Não foi possível atualizar o perfil.';
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
    this.mensagemErro = '';

    this.doacaoService.excluirDoacao(idItem).subscribe({
      next: () => this.removerItemDaLista(idItem),
      error: (erro) => {
        console.error('Erro ao excluir doação:', erro);
        this.mensagemErro = 'Não foi possível excluir a doação.';
      }
    });
  }

  private carregarHistorico(): void {
    this.isLoading = true;
    const idUsuario = this.authService.obterIdUsuario();

    if (!idUsuario) {
      this.mensagemErro = 'Usuário não identificado.';
      this.isLoading = false;
      return;
    }

    this.doacaoService.buscarHistoricoUsuario(idUsuario).subscribe({
      next: (itens) => {
        this.minhasDoacoes = itens;
        this.isLoading = false;
      },
      error: (erro) => {
        console.error('Erro ao buscar histórico:', erro);
        this.mensagemErro = 'Não foi possível carregar o histórico.';
        this.isLoading = false;
      }
    });
  }

  private removerItemDaLista(idItem: number): void {
    this.minhasDoacoes = this.minhasDoacoes.filter(item => item.id_item !== idItem);
  }
}
