import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DoacaoService } from '../../services/doacao.service';
import { Usuario } from '../../models/usuario.model';
import { ItemDoacao } from '../../models/item-doacao.model';

@Component({
  selector: 'app-perfil',
  imports: [],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  usuarioLogado: Usuario | null = null;
  minhasDoacoes: ItemDoacao[] = [];
  isLoading = true;
  mensagemErro = '';

  constructor(
    private readonly authService: AuthService,
    private readonly doacaoService: DoacaoService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.usuarioLogado = this.authService.obterUsuarioLogado();
    this.carregarHistorico();
  }

  editarPerfil(): void {
    this.router.navigate(['/login']);
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
