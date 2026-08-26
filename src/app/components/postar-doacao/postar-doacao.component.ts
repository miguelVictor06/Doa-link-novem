import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DoacaoService } from '../../services/doacao.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-postar-doacao',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './postar-doacao.component.html',
  styleUrl: './postar-doacao.component.css'
})
export class PostarDoacaoComponent implements OnInit {
  formularioDoacao: FormGroup;
  arquivoFoto: File | null = null;
  previewFoto: string | null = null;
  isSubmitting = false;
  mensagemErro = '';

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly doacaoService: DoacaoService,
    private readonly authService: AuthService,
    readonly router: Router
  ) {
    this.formularioDoacao = this.formBuilder.group({
      itemName: ['', Validators.required],
      condition: ['', Validators.required],
      phone: ['', [Validators.required, Validators.minLength(10)]],
      description: ['', Validators.required]
    });
  }

  ngOnInit(): void {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    this.processarArquivo(input.files[0]);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (!event.dataTransfer?.files.length) {
      return;
    }
    this.processarArquivo(event.dataTransfer.files[0]);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onSubmit(): void {
    this.mensagemErro = '';

    if (this.formularioDoacao.invalid) {
      this.formularioDoacao.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formData = this.construirFormData();

    this.doacaoService.cadastrarDoacao({
      titulo: this.formularioDoacao.value.itemName,
      descricao: this.formularioDoacao.value.description
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/hub']);
      },
      error: (erro) => {
        console.error('Erro ao publicar doação:', erro);
        this.mensagemErro = 'Não foi possível publicar a doação. Tente novamente.';
        this.isSubmitting = false;
      }
    });
  }

  obterErroCampo(nomeCampo: string): string {
    const controle = this.formularioDoacao.get(nomeCampo);
    if (!controle?.errors || !controle.touched) {
      return '';
    }
    if (controle.errors['required']) return 'Este campo é obrigatório.';
    if (controle.errors['minlength']) return 'Telefone muito curto.';
    return '';
  }

  private processarArquivo(arquivo: File): void {
    this.mensagemErro = '';

    if (!this.validarTipoArquivo(arquivo)) {
      this.mensagemErro = 'Formato inválido. Use JPEG ou PNG.';
      return;
    }

    if (!this.validarTamanhoArquivo(arquivo)) {
      this.mensagemErro = 'Arquivo muito grande. Limite de 5MB.';
      return;
    }

    this.arquivoFoto = arquivo;
    this.gerarPreview(arquivo);
  }

  private validarTipoArquivo(arquivo: File): boolean {
    return arquivo.type === 'image/jpeg' || arquivo.type === 'image/png';
  }

  private validarTamanhoArquivo(arquivo: File): boolean {
    const LIMITE_EM_BYTES = 5 * 1024 * 1024;
    return arquivo.size <= LIMITE_EM_BYTES;
  }

  private gerarPreview(arquivo: File): void {
    const leitor = new FileReader();
    leitor.onload = (evento) => {
      this.previewFoto = evento.target?.result as string;
    };
    leitor.readAsDataURL(arquivo);
  }

  private construirFormData(): FormData {
    const formData = new FormData();
    const formulario = this.formularioDoacao.value;

    formData.append('titulo', formulario.itemName as string);
    formData.append('descricao', formulario.description as string);
    formData.append('condicao', formulario.condition as string);
    formData.append('telefone', formulario.phone as string);

    if (this.arquivoFoto) {
      formData.append('foto', this.arquivoFoto);
    }

    const idUsuario = this.authService.obterIdUsuario();
    if (idUsuario) {
      formData.append('id_doador', idUsuario.toString());
    }

    return formData;
  }
}
