import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const ROTAS_COM_TRATAMENTO_PROPRIO = ['/auth/login', '/auth/cadastrar', '/auth/me', '/auth/logout'];

export const credentialsInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return proximo(requisicao.clone({ withCredentials: true })).pipe(
    catchError((erro: unknown) => {
      const tratamentoProprio = ROTAS_COM_TRATAMENTO_PROPRIO.some(rota =>
        requisicao.url.includes(rota)
      );

      if (erro instanceof HttpErrorResponse && erro.status === 401 && !tratamentoProprio) {
        authService.expirarSessao(router.url);
      }

      return throwError(() => erro);
    })
  );
};
