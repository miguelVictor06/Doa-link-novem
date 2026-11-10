import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DoacaoService } from '../../services/doacao.service';
import { ItemDoacao } from '../../models/item-doacao.model';

@Component({
  selector: 'app-detalhes-doacao',
  imports: [FormsModule, RouterLink],
  templateUrl: './detalhes-doacao.component.html',
  styleUrl: './detalhes-doacao.component.css'
})
export class DetalhesDoacaoComponent implements OnInit {
  readonly doacao = signal<ItemDoacao | null>(null);
  readonly isLoading = signal(true);
  readonly mensagemErro = signal('');
  readonly telefoneCopiado = signal(false);

  mensagemRapida = 'Olá! O item ainda está disponível para retirada?';

  constructor(
    private readonly rota: ActivatedRoute,
    private readonly rotas: Router,
    private readonly doacaoService: DoacaoService
  ) {}

  ngOnInit(): void {
    this.carregarDoacao();
  }

  entrarEmContato(): void {
    const idDoador = this.doacao()?.id_doador;

    if (idDoador === undefined) {
      return;
    }

    this.rotas.navigate(['/mensagens'], { queryParams: { com: idDoador } });
  }

  enviarMensagemRapida(): void {
    this.entrarEmContato();
  }

  voltarParaHub(): void {
    this.rotas.navigate(['/hub']);
  }

  copiarTelefone(): void {
    const telefone = this.doacao()?.telefone;

    if (!telefone || !navigator.clipboard?.writeText) {
      return;
    }

    navigator.clipboard.writeText(telefone).then(() => {
      this.telefoneCopiado.set(true);
      setTimeout(() => this.telefoneCopiado.set(false), 2000);
    });
  }

  ampliarImagem(foto: string): void {
    window.open(foto, '_blank');
  }

  formatarData(criadoEm: string): string {
    const data = new Date(criadoEm.replace(' ', 'T'));

    if (Number.isNaN(data.getTime())) {
      return criadoEm;
    }

    return data.toLocaleDateString('pt-BR');
  }

  formatoStatus(status: string): string {
    return status === 'Disponivel' ? 'Disponível' : 'Doado';
  }

  formatarCondicao(condicao: string | null): string {
    const mapa: Record<string, string> = {
      novo: 'Novo',
      factorynew: 'Novo',
      bom: 'Bom estado',
      usado: 'Usado',
      regular: 'Regular'
    };

    if (!condicao) {
      return '';
    }

    const chave = condicao.toLowerCase();
    return mapa[chave] ?? condicao;
  }

  private carregarDoacao(): void {
    const id = Number(this.rota.snapshot.paramMap.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      this.mensagemErro.set('Doação não encontrada.');
      this.isLoading.set(false);
      return;
    }

    this.doacaoService.buscarDoacaoPorId(id).subscribe({
      next: doacao => {
        this.doacao.set(doacao);
        this.isLoading.set(false);
      },
      error: () => {
        this.mensagemErro.set('Não foi possível carregar os detalhes desta doação.');
        this.isLoading.set(false);
      }
    });
  }
}