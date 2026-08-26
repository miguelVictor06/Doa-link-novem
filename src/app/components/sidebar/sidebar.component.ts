import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MensagemService } from '../../services/mensagem.service';

interface ItemNavegacao {
  rota: string;
  rotulo: string;
  icone: string;
  exata: boolean;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, NgTemplateOutlet],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  private readonly router = inject(Router);

  public readonly authService = inject(AuthService);

  private readonly mensagemService = inject(MensagemService);

  /** @internal exposto somente para o badge do template */
  public readonly naoLidas = this.mensagemService.naoLidas;

  private readonly urlAtual = signal(this.router.url);

  public readonly expandido = signal(false);
  public readonly menuAberto = signal(false);

  public readonly itensNavegacao: readonly ItemNavegacao[] = [
    { rota: '/hub', rotulo: 'Doações', icone: 'storefront', exata: true },
    { rota: '/pesquisar', rotulo: 'Pesquisar', icone: 'search', exata: true },
    { rota: '/postar', rotulo: 'Postar Doação', icone: 'add_box', exata: false },
    { rota: '/mensagens', rotulo: 'Mensagens', icone: 'chat', exata: false },
    { rota: '/perfil', rotulo: 'Meu Perfil', icone: 'account_circle', exata: false },
    { rota: '/sobre', rotulo: 'Sobre o Site', icone: 'info', exata: false }
  ];

  private readonly rotaLoginAtiva = computed(() => this.ehRotaLogin(this.urlAtual()));

  public readonly visivel = computed(() => {
    const logado = this.authService.estaLogado();
    const naRotaLogin = this.rotaLoginAtiva();
    return logado && !naRotaLogin;
  });

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe(evento => this.aoNavegar(evento));
  }

  public expandirSidebar(): void {
    this.expandido.set(true);
  }

  public recolherSidebar(): void {
    this.expandido.set(false);
  }

  public abrirMenu(): void {
    this.menuAberto.set(true);
  }

  public fecharMenu(): void {
    this.menuAberto.set(false);
  }

  private aoNavegar(evento: unknown): void {
    if (!(evento instanceof NavigationEnd)) return;

    this.urlAtual.set(evento.urlAfterRedirects);
    this.fecharMenu();
    this.atualizarNaoLidas();
  }

  private atualizarNaoLidas(): void {
    const idUsuario = this.authService.obterIdUsuario();

    if (!idUsuario) {
      this.mensagemService.naoLidas.set(0);
      return;
    }

    this.mensagemService.buscarMensagens(idUsuario).subscribe({
      next: mensagens => this.mensagemService.recalcularNaoLidas(mensagens, idUsuario),
      error: () => this.mensagemService.naoLidas.set(0)
    });
  }

  private ehRotaLogin(url: string): boolean {
    return url.startsWith('/login');
  }
}
