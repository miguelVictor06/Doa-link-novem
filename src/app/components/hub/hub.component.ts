import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { DoacaoService } from '../../services/doacao.service';
import { ItemDoacao } from '../../models/item-doacao.model';

@Component({
  selector: 'app-hub',
  imports: [],
  templateUrl: './hub.component.html',
  styleUrl: './hub.component.css'
})
export class HubComponent implements OnInit {
  doacoesDisponiveis: ItemDoacao[] = [];
  isLoading = true;
  mensagemErro = '';

  constructor(
    private readonly doacaoService: DoacaoService,
    readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.carregarDoacoes();
  }

  solicitarItem(idItem: number): void {
    this.mensagemErro = '';

    this.doacaoService.solicitarItem(idItem).subscribe({
      next: () => {
        this.removerItemDaLista(idItem);
        alert('Solicitação realizada com sucesso!');
      },
      error: (erro) => {
        console.error('Erro ao solicitar item:', erro);
        this.mensagemErro = 'Não foi possível solicitar este item. Tente novamente.';
      }
    });
  }

  private carregarDoacoes(): void {
    this.isLoading = true;
    this.mensagemErro = '';

    this.doacaoService.buscarDoacoesDisponiveis().subscribe({
      next: (itens) => {
        this.doacoesDisponiveis = this.filtrarItensProprios(itens);
        this.isLoading = false;
      },
      error: (erro) => {
        console.error('Erro ao buscar doações:', erro);
        this.mensagemErro = 'Não foi possível carregar as doações.';
        this.isLoading = false;
      }
    });
  }

  private filtrarItensProprios(itens: ItemDoacao[]): ItemDoacao[] {
    const idUsuario = this.authService.obterIdUsuario();
    return itens.filter(item => item.id_doador !== idUsuario);
  }

  private removerItemDaLista(idItem: number): void {
    this.doacoesDisponiveis = this.doacoesDisponiveis.filter(item => item.id_item !== idItem);
  }
}
