import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (_rota, estado) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.estadoAutenticacao() === 'desconhecido') {
    await authService.restaurarSessao();
  }

  if (authService.estaLogado()) {
    return true;
  }

  const returnUrl = estado.url && estado.url !== '/login' ? estado.url : null;
  const sessaoIndisponivel =
    authService.estadoAutenticacao() === 'desconhecido' && authService.erroRestauracao() !== null;

  return router.createUrlTree(['/login'], {
    queryParams: {
      ...(returnUrl ? { returnUrl } : {}),
      ...(sessaoIndisponivel ? { sessao: 'indisponivel' } : {})
    }
  });
};
