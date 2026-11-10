import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'hub',
    loadComponent: () =>
      import('./components/hub/hub.component').then(m => m.HubComponent),
    canActivate: [authGuard]
  },
  {
    path: 'doacoes/:id',
    loadComponent: () =>
      import('./components/detalhes-doacao/detalhes-doacao.component').then(m => m.DetalhesDoacaoComponent),
    canActivate: [authGuard]
  },
  {
    path: 'pesquisar',
    loadComponent: () =>
      import('./components/pesquisar/pesquisar.component').then(m => m.PesquisarComponent),
    canActivate: [authGuard]
  },
  {
    path: 'pedidos/criar',
    loadComponent: () =>
      import('./components/criacao-pedido/criacao-pedido.component').then(m => m.CriacaoPedidoComponent),
    canActivate: [authGuard]
  },
  {
    path: 'pedidos',
    loadComponent: () =>
      import('./components/pedidos/pedidos.component').then(m => m.PedidosComponent),
    canActivate: [authGuard]
  },
  {
    path: 'perfil',
    loadComponent: () =>
      import('./components/perfil/perfil.component').then(m => m.PerfilComponent),
    canActivate: [authGuard]
  },
  {
    path: 'postar',
    loadComponent: () =>
      import('./components/postar-doacao/postar-doacao.component').then(m => m.PostarDoacaoComponent),
    canActivate: [authGuard]
  },
  {
    path: 'mensagens',
    loadComponent: () =>
      import('./components/mensagens/mensagens.component').then(m => m.MensagensComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sobre',
    loadComponent: () =>
      import('./components/sobre/sobre.component').then(m => m.SobreComponent)
  },
  { path: '**', redirectTo: '/login' }
];
