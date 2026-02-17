import React, { useState, useEffect } from 'react';
import { MapPin, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useViaCep } from '../hooks/useViaCep';
import { ViaCEPService } from '../lib/viaCep';

interface CEPInputProps {
  value?: string;
  onChange?: (cep: string, address?: any) => void;
  onAddressFound?: (address: any) => void;
  autoFill?: boolean;
  showAddressPreview?: boolean;
  className?: string;
  required?: boolean;
}

export function CEPInput({
  value = '',
  onChange,
  onAddressFound,
  autoFill = true,
  showAddressPreview = true,
  className = '',
  required = false,
}: CEPInputProps) {
  const [cep, setCep] = useState(value);
  const [touched, setTouched] = useState(false);
  const { address, loading, error, searchCEP, clearAddress, validateCEP } = useViaCep();

  // Buscar CEP quando digitar 8 números
  useEffect(() => {
    const cleanCEP = ViaCEPService.formatCEP(cep);
    if (cleanCEP.length === 8 && validateCEP(cleanCEP)) {
      searchCEP(cleanCEP);
    } else if (cleanCEP.length < 8) {
      clearAddress();
    }
  }, [cep, searchCEP, clearAddress, validateCEP]);

  // Notificar quando endereço for encontrado
  useEffect(() => {
    if (address && autoFill) {
      if (onChange) {
        onChange(ViaCEPService.formatCEP(cep), address);
      }
      if (onAddressFound) {
        onAddressFound(address);
      }
    }
  }, [address, cep, onChange, onAddressFound, autoFill]);

  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Permitir apenas números e hífen
    const formatted = value.replace(/[^\d-]/g, '');

    // Auto-formatar com hífen
    let finalValue = formatted;
    if (formatted.length <= 9) {
      const numbers = formatted.replace(/-/g, '');
      if (numbers.length > 5) {
        finalValue = `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
      } else {
        finalValue = numbers;
      }
    }

    setCep(finalValue);
    if (!touched) setTouched(true);
  };

  const isValid = address !== null && !error;
  const showError = touched && error && cep.length > 0;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : isValid ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <MapPin className="w-4 h-4 text-gray-400" />
          )}
        </div>

        <input
          type="text"
          value={cep}
          onChange={handleCEPChange}
          placeholder="00000-000"
          maxLength={9}
          required={required}
          className={`
            w-full pl-10 pr-3 py-2 border rounded-lg
            focus:outline-none focus:ring-2 transition-colors
            ${isValid
              ? 'border-green-500 focus:ring-green-500'
              : showError
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
            }
          `}
        />

        {/* Link para buscar CEP */}
        <a
          href="https://buscacepinter.correios.com.br/app/endereco/index.php"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800"
        >
          Não sei meu CEP
        </a>
      </div>

      {/* Mensagem de erro */}
      {showError && (
        <div className="flex items-center gap-1 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Preview do endereço encontrado */}
      {showAddressPreview && address && !error && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-green-800">
              <p className="font-medium">Endereço encontrado:</p>
              <p className="text-green-700 mt-1">
                {address.logradouro && `${address.logradouro}, `}
                {address.bairro}
              </p>
              <p className="text-green-700">
                {address.localidade} - {address.uf}
              </p>
              <p className="text-green-600 text-xs mt-1">
                CEP: {ViaCEPService.displayCEP(address.cep)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Informação de carregamento */}
      {loading && (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Buscando endereço...</span>
        </div>
      )}
    </div>
  );
}