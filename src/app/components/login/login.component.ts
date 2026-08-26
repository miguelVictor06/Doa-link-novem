import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  formularioLogin: FormGroup;
  isLoginMode = true;
  mensagemErro = '';

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.formularioLogin = this.criarFormulario();
  }

  alternarModo(): void {
    this.isLoginMode = !this.isLoginMode;
    this.mensagemErro = '';
    this.reconfigurarValidacao();
  }

  onSubmit(): void {
    this.mensagemErro = '';

    if (this.formularioLogin.invalid) {
      this.formularioLogin.markAllAsTouched();
      return;
    }

    this.isLoginMode
      ? this.processarLogin()
      : this.processarCadastro();
  }

  private processarLogin(): void {
    const dados = this.extrairDadosLogin();

    this.authService.login(dados).subscribe({
      next: () => this.router.navigate(['/hub']),
      error: (erro) => {
        console.error('Erro no login:', erro);
        this.mensagemErro = 'Falha ao realizar login. Verifique suas credenciais.';
      }
    });
  }

  private processarCadastro(): void {
    const dados = this.extrairDadosCadastro();

    this.authService.cadastrar(dados).subscribe({
      next: () => this.router.navigate(['/hub']),
      error: (erro) => {
        console.error('Erro no cadastro:', erro);
        this.mensagemErro = 'Falha ao cadastrar. Tente novamente.';
      }
    });
  }

  private criarFormulario(): FormGroup {
    return this.formBuilder.group({
      nome: [''],
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(6)]],
      confirmarSenha: [''],
      endereco: ['']
    });
  }

  private reconfigurarValidacao(): void {
    const nomeControle = this.formularioLogin.get('nome');
    const enderecoControle = this.formularioLogin.get('endereco');
    const confirmarControle = this.formularioLogin.get('confirmarSenha');

    if (this.isLoginMode) {
      nomeControle?.clearValidators();
      enderecoControle?.clearValidators();
      confirmarControle?.clearValidators();
    } else {
      nomeControle?.setValidators([Validators.required]);
      enderecoControle?.setValidators([Validators.required]);
      confirmarControle?.setValidators([Validators.required]);
    }

    nomeControle?.updateValueAndValidity();
    enderecoControle?.updateValueAndValidity();
    confirmarControle?.updateValueAndValidity();
  }

  private extrairDadosLogin() {
    const formulario = this.formularioLogin.value;
    return {
      email: formulario.email as string,
      senha: formulario.senha as string
    };
  }

  private extrairDadosCadastro() {
    const formulario = this.formularioLogin.value;
    return {
      nome: formulario.nome as string,
      email: formulario.email as string,
      senha: formulario.senha as string,
      endereco: formulario.endereco as string
    };
  }

  obterErroCampo(nomeCampo: string): string {
    const controle = this.formularioLogin.get(nomeCampo);
    if (!controle?.errors || !controle.touched) {
      return '';
    }
    if (controle.errors['required']) return 'Este campo é obrigatório.';
    if (controle.errors['email']) return 'Email inválido.';
    if (controle.errors['minlength']) return 'Mínimo de 6 caracteres.';
    return '';
  }
}
