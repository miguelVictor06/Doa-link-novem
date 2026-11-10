import { HttpInterceptorFn } from '@angular/common/http';

export const credentialsInterceptor: HttpInterceptorFn = (requisicao, proximo) =>
  proximo(requisicao.clone({ withCredentials: true }));
