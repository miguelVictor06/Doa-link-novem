import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
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
  doacoesDisponiveis = signal<ItemDoacao[]>([]);
  isLoading = signal(true);
  mensagemErro = signal('');
  mensagemSucesso = signal('');

  constructor(
    private readonly doacaoService: DoacaoService,
    private readonly router: Router,
    readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.carregarDoacoes();
  }

  abrirDetalhes(idItem: number): void {
    this.router.navigate(['/doacoes', idItem]);
  }

  solicitarItem(idItem: number): void {
    this.mensagemErro.set('');
    this.mensagemSucesso.set('');
    const idReceptor = this.authService.obterIdUsuario();

    if (!idReceptor) {
      this.mensagemErro.set('Você precisa estar logado para solicitar um item.');
      return;
    }

    this.doacaoService.solicitarItem(idItem).subscribe({
      next: () => {
        this.mensagemSucesso.set('Solicitação registrada! O item continua disponível para outras pessoas.');
      },
      error: (erro) => {
        console.error('Erro ao solicitar item:', erro);
        this.mensagemErro.set(
          erro?.error?.erro ?? 'Não foi possível solicitar este item. Tente novamente.'
        );
      }
    });
  }

  private carregarDoacoes(): void {
    this.isLoading.set(true);
    this.mensagemErro.set('');
    this.mensagemSucesso.set('');

    this.doacaoService.buscarDoacoesDisponiveis().subscribe({
      next: (itens) => {
        //this.doacoesDisponiveis.set(this.filtrarItensProprios(itens));
        this.doacoesDisponiveis.set(itens);
        this.isLoading.set(false);
      },
      error: (erro) => {
        console.error('Erro ao buscar doações:', erro);
        this.mensagemErro.set('Não foi possível carregar as doações.');
        this.isLoading.set(false);
      }
    });
  }

  private filtrarItensProprios(itens: ItemDoacao[]): ItemDoacao[] {
    const idUsuario = this.authService.obterIdUsuario();
    return itens.filter(item => item.id_doador !== idUsuario);
  }
}
