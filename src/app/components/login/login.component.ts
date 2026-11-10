import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { validarCPF } from '../../utils/cpf-validator';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  formularioLogin: FormGroup;
  formularioCadastro: FormGroup;
  mensagemErro = '';

  private readonly validarCpf = (controle: AbstractControl): ValidationErrors | null => {
    const valor = controle.value;
    if (!valor) {
      return null;
    }
    if (!validarCPF(valor)) {
      return { cpf: 'CPF inválido.' };
    }
    return null;
  };

  private readonly validarCnpj = (controle: AbstractControl): ValidationErrors | null => {
    const digitos = String(controle.value ?? '').replace(/\D/g, '');

    if (digitos.length !== 14) {
      return { cnpj: 'O CNPJ deve ter 14 dígitos.' };
    }

    if (new Set(digitos).size === 1) {
      return { cnpj: 'CNPJ inválido.' };
    }

    const digitoUm = this.calcularDigitoCnpj(digitos, 12);
    const digitoDois = this.calcularDigitoCnpj(digitos, 13);

    if (digitoUm !== Number(digitos[12])) {
      return { cnpj: 'CNPJ inválido.' };
    }

    if (digitoDois !== Number(digitos[13])) {
      return { cnpj: 'CNPJ inválido.' };
    }

    return null;
  };

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.formularioLogin = this.criarFormularioLogin();
    this.formularioCadastro = this.criarFormularioCadastro();
    this.observarMudancaDeTipo();
    this.observarMudancaDeTipoContaCadastro();
  }

  onSubmitLogin(): void {
    this.mensagemErro = '';

    if (this.formularioLogin.invalid) {
      this.formularioLogin.markAllAsTouched();
      return;
    }

    this.processarLogin();
  }

  onSubmitCadastro(): void {
    this.mensagemErro = '';

    if (this.formularioCadastro.invalid) {
      this.formularioCadastro.markAllAsTouched();
      return;
    }

    this.processarCadastro();
  }

  private processarLogin(): void {
    const dados = this.extrairDadosLogin();

    this.authService.login(dados).subscribe({
      next: () => this.router.navigate(['/hub']),
      error: (erro) => {
        console.error('Erro no login:', erro);
        this.mensagemErro = erro?.error?.erro ?? 'Falha ao realizar login. Verifique suas credenciais.';
      }
    });
  }

  private processarCadastro(): void {
    const dados = this.extrairDadosCadastro();

    this.authService.cadastrar(dados).subscribe({
      next: () => this.router.navigate(['/hub']),
      error: (erro) => {
        console.error('Erro no cadastro:', erro);
        this.mensagemErro = erro?.error?.erro ?? 'Falha ao cadastrar. Tente novamente.';
      }
    });
  }

  private criarFormularioLogin(): FormGroup {
    return this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  private criarFormularioCadastro(): FormGroup {
    return this.formBuilder.group({
      nome: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(6)]],
      confirmarSenha: ['', [Validators.required]],
      endereco: ['', [Validators.required]],
      tipoConta: ['Pessoal'],
      cnpj: [''],
      cpf: ['']
    });
  }

  private aplicarValidacaoCnpj(): void {
    const cnpjControle = this.formularioCadastro.get('cnpj');
    const contaInstituicao = this.obterTipoConta() === 'Instituicao';
    const validadores = contaInstituicao ? [Validators.required, this.validarCnpj] : [];

    cnpjControle?.setValidators(validadores);
    cnpjControle?.updateValueAndValidity();
  }

  private aplicarValidacaoCpf(): void {
    const cpfControle = this.formularioCadastro.get('cpf');
    const contaPessoal = this.obterTipoConta() === 'Pessoal';
    const validadores = contaPessoal ? [Validators.required, this.validarCpf] : [];

    cpfControle?.setValidators(validadores);
    cpfControle?.updateValueAndValidity();
    if (contaPessoal && cpfControle?.value) {
      cpfControle.markAsDirty();
    }
  }

  private observarMudancaDeTipo(): void {
    this.formularioCadastro.get('tipoConta')?.valueChanges.subscribe(() => {
      this.aplicarValidacaoCnpj();
      this.aplicarValidacaoCpf();
    });
  }

  private observarMudancaDeTipoContaCadastro(): void {
    this.aplicarValidacaoCpf();
    this.aplicarValidacaoCnpj();
    this.formularioCadastro.get('cpf')?.valueChanges.subscribe((valor: string) => {
      const cpfLimpo = String(valor ?? '').replace(/[^\d]/g, '');
      if (cpfLimpo.length === 11) {
        this.aplicarValidacaoCpf();
        this.formularioCadastro.get('cpf')?.markAsTouched();
        this.formularioCadastro.get('cpf')?.markAsDirty();
      }
    });
  }

  private extrairDadosLogin() {
    const formulario = this.formularioLogin.value;
    return {
      email: formulario.email as string,
      senha: formulario.senha as string
    };
  }

  private extrairDadosCadastro() {
    const formulario = this.formularioCadastro.value;
    const tipoConta = this.obterTipoConta();
    return {
      nome: formulario.nome as string,
      email: formulario.email as string,
      senha: formulario.senha as string,
      endereco: formulario.endereco as string,
      tipo: tipoConta,
      cpf: tipoConta === 'Pessoal' ? (formulario.cpf as string) : undefined,
      cnpj: tipoConta === 'Instituicao' ? (formulario.cnpj as string) : undefined
    };
  }

  private obterTipoConta(): string {
    return this.formularioCadastro.get('tipoConta')?.value ?? 'Pessoal';
  }

  private calcularDigitoCnpj(cnpj: string, posicao: number): number {
    const pesos = posicao === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let soma = 0;
    for (let indice = 0; indice < posicao; indice++) {
      soma += Number(cnpj[indice]) * pesos[indice];
    }

    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  }

  obterErroCampoLogin(nomeCampo: string): string {
    const controle = this.formularioLogin.get(nomeCampo);
    if (!controle?.errors || !controle.touched) {
      return '';
    }
    if (controle.errors['required']) return 'Este campo é obrigatório.';
    if (controle.errors['email']) return 'Email inválido.';
    if (controle.errors['minlength']) return 'Mínimo de 6 caracteres.';
    return '';
  }

  obterErroCampoCadastro(nomeCampo: string): string {
    const controle = this.formularioCadastro.get(nomeCampo);
    if (!controle?.errors || !controle.touched) {
      return '';
    }
    if (controle.errors['required']) return 'Este campo é obrigatório.';
    if (controle.errors['email']) return 'Email inválido.';
    if (controle.errors['minlength']) return 'Mínimo de 6 caracteres.';
    if (controle.errors['cnpj']) return controle.errors['cnpj'];
    if (controle.errors['cpf']) return controle.errors['cpf'];
    return '';
  }
}
