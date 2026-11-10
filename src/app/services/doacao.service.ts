import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ItemDoacao } from '../models/item-doacao.model';
import { obterApiUrl } from '../config/api-config';

@Injectable({
  providedIn: 'root'
})
export class DoacaoService {
  private readonly apiUrl = obterApiUrl();

  constructor(private readonly http: HttpClient) {}

  buscarDoacoesDisponiveis(): Observable<ItemDoacao[]> {
    return this.http.get<ItemDoacao[]>(`${this.apiUrl}/doacoes`);
  }

  buscarDoacaoPorId(idItem: number): Observable<ItemDoacao> {
    return this.http.get<ItemDoacao>(`${this.apiUrl}/doacoes/${idItem}`);
  }

  cadastrarDoacaoFormData(formData: FormData): Observable<ItemDoacao> {
    return this.http.post<ItemDoacao>(`${this.apiUrl}/doacoes`, formData);
  }

  solicitarItem(idItem: number): Observable<ItemDoacao> {
    return this.http.put<ItemDoacao>(`${this.apiUrl}/doacoes/${idItem}/solicitar`, {});
  }

  excluirDoacao(idItem: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/doacoes/${idItem}`);
  }

  buscarHistoricoUsuario(idUsuario: number): Observable<ItemDoacao[]> {
    return this.http.get<ItemDoacao[]>(`${this.apiUrl}/usuarios/${idUsuario}/historico`);
  }
}
