import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ItemDoacao, DoacaoPayload } from '../models/item-doacao.model';

@Injectable({
  providedIn: 'root'
})
export class DoacaoService {
  private readonly API_URL = 'http://localhost:8080/api';

  constructor(private readonly http: HttpClient) {}

  buscarDoacoesDisponiveis(): Observable<ItemDoacao[]> {
    return this.http.get<ItemDoacao[]>(`${this.API_URL}/doacoes`);
  }

  cadastrarDoacao(dados: DoacaoPayload): Observable<ItemDoacao> {
    return this.http.post<ItemDoacao>(`${this.API_URL}/doacoes`, dados);
  }

  solicitarItem(idItem: number): Observable<ItemDoacao> {
    return this.http.put<ItemDoacao>(`${this.API_URL}/doacoes/${idItem}/solicitar`, {});
  }

  excluirDoacao(idItem: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/doacoes/${idItem}`);
  }

  buscarHistoricoUsuario(idUsuario: number): Observable<ItemDoacao[]> {
    return this.http.get<ItemDoacao[]>(`${this.API_URL}/usuarios/${idUsuario}/historico`);
  }
}
