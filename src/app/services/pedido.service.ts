import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PedidoNecessidade, PedidoPayload } from '../models/pedido-necessidade.model';
import { obterApiUrl } from '../config/api-config';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private readonly apiUrl = obterApiUrl();

  constructor(private readonly http: HttpClient) {}

  listarPedidos(): Observable<PedidoNecessidade[]> {
    return this.http.get<PedidoNecessidade[]>(`${this.apiUrl}/pedidos`);
  }

  buscarPedidoPorId(idPedido: number): Observable<PedidoNecessidade> {
    return this.http.get<PedidoNecessidade>(`${this.apiUrl}/pedidos/${idPedido}`);
  }

  cadastrarPedido(dados: PedidoPayload): Observable<PedidoNecessidade> {
    return this.http.post<PedidoNecessidade>(`${this.apiUrl}/pedidos`, dados);
  }

  atualizarPedido(idPedido: number, dados: Partial<PedidoPayload>): Observable<PedidoNecessidade> {
    return this.http.put<PedidoNecessidade>(`${this.apiUrl}/pedidos/${idPedido}`, dados);
  }

  ajudarNoPedido(idPedido: number, quantidade = 1): Observable<PedidoNecessidade> {
    return this.http.put<PedidoNecessidade>(`${this.apiUrl}/pedidos/${idPedido}/atender`, {
      quantidade
    });
  }

  excluirPedido(idPedido: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/pedidos/${idPedido}`);
  }
}
