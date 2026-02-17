export interface ViaCEPAddress {
  cep: string;
  logradouro: string;
  complemento: string;
  unidade?: string;
  bairro: string;
  localidade: string;
  uf: string;
  estado?: string;
  ibge?: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
  erro?: boolean;
}

export class ViaCEPService {
  private static readonly API_URL = 'https://viacep.com.br/ws';

  /**
   * Formata CEP removendo caracteres não numéricos
   */
  static formatCEP(cep: string): string {
    return cep.replace(/\D/g, '');
  }

  /**
   * Valida formato do CEP (deve ter 8 dígitos)
   */
  static validateCEP(cep: string): boolean {
    const cleanCEP = this.formatCEP(cep);
    return /^[0-9]{8}$/.test(cleanCEP);
  }

  /**
   * Formata CEP para exibição (00000-000)
   */
  static displayCEP(cep: string): string {
    const cleanCEP = this.formatCEP(cep);
    if (cleanCEP.length === 8) {
      return `${cleanCEP.substring(0, 5)}-${cleanCEP.substring(5)}`;
    }
    return cep;
  }

  /**
   * Busca endereço pelo CEP
   */
  static async getAddress(cep: string): Promise<ViaCEPAddress> {
    const cleanCEP = this.formatCEP(cep);

    if (!this.validateCEP(cleanCEP)) {
      throw new Error('CEP inválido. O CEP deve conter 8 dígitos.');
    }

    try {
      const response = await fetch(`${this.API_URL}/${cleanCEP}/json/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar CEP');
      }

      const data: ViaCEPAddress = await response.json();

      // ViaCEP retorna { erro: true } quando o CEP não existe
      if (data.erro) {
        throw new Error('CEP não encontrado');
      }

      // Adicionar nome completo do estado
      data.estado = this.getStateName(data.uf);

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao buscar informações do CEP');
    }
  }

  /**
   * Retorna o nome completo do estado a partir da sigla
   */
  private static getStateName(uf: string): string {
    const states: Record<string, string> = {
      AC: 'Acre',
      AL: 'Alagoas',
      AP: 'Amapá',
      AM: 'Amazonas',
      BA: 'Bahia',
      CE: 'Ceará',
      DF: 'Distrito Federal',
      ES: 'Espírito Santo',
      GO: 'Goiás',
      MA: 'Maranhão',
      MT: 'Mato Grosso',
      MS: 'Mato Grosso do Sul',
      MG: 'Minas Gerais',
      PA: 'Pará',
      PB: 'Paraíba',
      PR: 'Paraná',
      PE: 'Pernambuco',
      PI: 'Piauí',
      RJ: 'Rio de Janeiro',
      RN: 'Rio Grande do Norte',
      RS: 'Rio Grande do Sul',
      RO: 'Rondônia',
      RR: 'Roraima',
      SC: 'Santa Catarina',
      SP: 'São Paulo',
      SE: 'Sergipe',
      TO: 'Tocantins',
    };

    return states[uf.toUpperCase()] || uf;
  }

  /**
   * Calcula distância aproximada entre CEPs (para estimativa de frete)
   * Retorna a distância em KM (aproximada)
   */
  static async calculateDistance(cepOrigin: string, cepDestination: string): Promise<number> {
    try {
      const [origin, destination] = await Promise.all([
        this.getAddress(cepOrigin),
        this.getAddress(cepDestination),
      ]);

      // Esta é uma estimativa muito simplificada
      // Para um cálculo real, seria necessário usar coordenadas geográficas
      // ou integrar com uma API de mapas (Google Maps, Mapbox, etc.)

      // Estimativa baseada em estados
      if (origin.uf === destination.uf) {
        // Mesmo estado
        if (origin.localidade === destination.localidade) {
          // Mesma cidade
          return 20; // 20km média dentro da cidade
        }
        return 150; // 150km média dentro do estado
      }

      // Estados diferentes - estimativa baseada em regiões
      const regions: Record<string, string[]> = {
        norte: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
        nordeste: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
        centroOeste: ['DF', 'GO', 'MT', 'MS'],
        sudeste: ['ES', 'MG', 'RJ', 'SP'],
        sul: ['PR', 'RS', 'SC'],
      };

      const getRegion = (uf: string): string => {
        for (const [region, states] of Object.entries(regions)) {
          if (states.includes(uf)) return region;
        }
        return '';
      };

      const originRegion = getRegion(origin.uf);
      const destRegion = getRegion(destination.uf);

      if (originRegion === destRegion) {
        return 500; // Mesma região
      }

      // Regiões adjacentes
      const adjacentRegions: Record<string, string[]> = {
        norte: ['nordeste', 'centroOeste'],
        nordeste: ['norte', 'centroOeste', 'sudeste'],
        centroOeste: ['norte', 'nordeste', 'sudeste', 'sul'],
        sudeste: ['nordeste', 'centroOeste', 'sul'],
        sul: ['centroOeste', 'sudeste'],
      };

      if (adjacentRegions[originRegion]?.includes(destRegion)) {
        return 1000; // Regiões adjacentes
      }

      return 2000; // Regiões distantes
    } catch (error) {
      console.error('Erro ao calcular distância:', error);
      return 1000; // Retorna valor padrão em caso de erro
    }
  }
}