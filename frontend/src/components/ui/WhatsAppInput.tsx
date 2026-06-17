import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";

interface WhatsAppInputProps {
  value: string;
  onChange: (value: string) => void;
  ddi?: string;
  onDdiChange?: (ddi: string) => void;
  id?: string;
  className?: string;
}

// Lista de DDIs mais comuns
const DDIs = [
  { code: "+55", country: "Brasil" },
  { code: "+1", country: "EUA" },
  { code: "+44", country: "Reino Unido" },
  { code: "+351", country: "Portugal" },
  { code: "+34", country: "Espanha" },
  { code: "+54", country: "Argentina" },
  { code: "+56", country: "Chile" },
  { code: "+57", country: "Colômbia" },
  { code: "+58", country: "Venezuela" },
  { code: "+595", country: "Paraguai" },
  { code: "+598", country: "Uruguai" },
];

// Função para formatar número de telefone baseado no DDI
const formatPhoneNumber = (value: string, ddi: string): string => {
  if (!value) return '';
  
  // Remover todos os caracteres não numéricos
  const digits = value.replace(/\D/g, '');
  
  // Formatar baseado no DDI
  switch (ddi) {
    case '+55': // Brasil
      if (digits.length <= 10) {
        // Formato: (XX) XXXX-XXXX
        return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
      } else {
        // Formato: (XX) XXXXX-XXXX
        return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
      }
    case '+1': // EUA
      if (digits.length === 10) {
        // Formato: (XXX) XXX-XXXX
        return digits.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
      }
      return digits;
    default:
      // Para outros países, apenas remover caracteres especiais
      return digits;
  }
};

export function WhatsAppInput({
  value,
  onChange,
  ddi = "+55",
  onDdiChange,
  id = "whatsapp",
  className = ""
}: WhatsAppInputProps) {
  console.log('WhatsAppInput - value:', value, 'ddi:', ddi);
  
  // Estado local para o valor formatado
  const [formattedValue, setFormattedValue] = useState('');
  
  // Atualizar o valor formatado quando o value ou ddi mudarem
  useEffect(() => {
    const formatted = formatPhoneNumber(value, ddi);
    setFormattedValue(formatted);
  }, [value, ddi]);
  
  // Manipular mudanças no input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatPhoneNumber(rawValue, ddi);
    setFormattedValue(formatted);
    
    // Extrair apenas os dígitos para o onChange
    const digitsOnly = rawValue.replace(/\D/g, '');
    onChange(digitsOnly);
  };
  
  return (
    <div className={`flex gap-2 ${className}`}>
      <Select value={ddi} onValueChange={onDdiChange}>
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DDIs.map((ddiOption) => (
            <SelectItem key={ddiOption.code} value={ddiOption.code}>
              {ddiOption.code} {ddiOption.country}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        value={formattedValue}
        onChange={handleInputChange}
        placeholder={ddi === '+55' ? '(00) 00000-0000' : 'Phone number'}
        className="flex-1"
      />
    </div>
  );
}