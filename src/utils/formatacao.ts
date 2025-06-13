export function formatarValor(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor / 100);
}

export function converterParaCentavos(valor: string): number {
  // Remove todos os caracteres não numéricos
  const valorNumerico = valor.replace(/\D/g, '');
  // Converte para número e divide por 100 para obter os centavos
  return parseInt(valorNumerico, 10);
}

export function formatarInput(valor: string): string {
  // Remove todos os caracteres não numéricos
  const valorNumerico = valor.replace(/\D/g, '');
  // Converte para número em reais (divide por 100)
  const valorEmReais = parseInt(valorNumerico, 10) / 100;
  // Formata como moeda
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valorEmReais);
}

export function formatarData(dataParam: Date | string): string {
  let dia: string;
  let mes: string;
  let ano: string;

  if (dataParam instanceof Date) {
    // Se for um objeto Date, extrai as partes
    dia = String(dataParam.getDate()).padStart(2, '0');
    mes = String(dataParam.getMonth() + 1).padStart(2, '0'); // Mês é 0-indexado
    ano = String(dataParam.getFullYear());
  } else if (typeof dataParam === 'string') {
    // Se for uma string (para o caso de entrada manual de números)
    // Remove tudo que não for número
    const numeros = dataParam.replace(/\D/g, '');

    // Limita a 8 dígitos (DDMMAAAA)
    const numerosLimitados = numeros.slice(0, 8);

    // Formata a data com base no que foi digitado
    if (numerosLimitados.length <= 2) {
      return numerosLimitados;
    } else if (numerosLimitados.length <= 4) {
      return `${numerosLimitados.slice(0, 2)}/${numerosLimitados.slice(2)}`;
    } else {
      // Se tiver 8 dígitos ou mais, pega os primeiros 8 para formar DD/MM/AAAA
      dia = numerosLimitados.slice(0, 2);
      mes = numerosLimitados.slice(2, 4);
      ano = numerosLimitados.slice(4, 8); // Garante que o ano tenha 4 dígitos
    }
  } else {
    return ''; // Retorna string vazia ou lança um erro para tipo inválido
  }

  // Combina as partes da data final
  return `${dia}/${mes}/${ano}`;
}

// --- Exemplos de uso ---

// 1. Usando com um objeto Date (para a data atual)
const dataAtual = new Date();
console.log(`Data atual formatada: ${formatarData(dataAtual)}`); // Ex: "10/06/2025"

// 2. Usando com a string ISO (APENAS SE QUISER USAR A STRING ISO)
// ATENÇÃO: Se a intenção é formatar new Date().toISOString(), o ideal é passar o objeto Date
// diretamente como no exemplo 1. Mas se a string ISO já vem de algum lugar,
// a lógica abaixo será necessária.
const dataIsoString = new Date().toISOString();
console.log(`String ISO original: ${dataIsoString}`);
// Para formatar uma STRING ISO, você precisaria de uma função que PARSE a string ISO.
// A função formatarData original não é projetada para isso.
// Se você realmente precisa formatar a string ISO, faça assim:
function formatarIsoStringParaDDMMYYYY(isoString: string): string {
  const dateObj = new Date(isoString); // Converte a string ISO de volta para um objeto Date
  const dia = String(dateObj.getDate()).padStart(2, '0');
  const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
  const ano = String(dateObj.getFullYear());
  return `${dia}/${mes}/${ano}`;
}
console.log(`String ISO formatada: ${formatarIsoStringParaDDMMYYYY(dataIsoString)}`); // Ex: "10/06/2025"

// 3. Testando a função com entrada de string numérica (comportamento original)
console.log(`Entrada "123": ${formatarData("123")}`); // Saída: "123"
console.log(`Entrada "1234": ${formatarData("1234")}`); // Saída: "12/34"
console.log(`Entrada "1234567": ${formatarData("1234567")}`); // Saída: "12/34/567" (ano com 3 dígitos)
console.log(`Entrada "12345678": ${formatarData("12345678")}`); // Saída: "12/34/5678"
console.log(`Entrada "12/AB/34 C D56-EF78": ${formatarData("12/AB/34 C D56-EF78")}`); // Saída: "12/34/5678"

export function formatarData2(texto: string): string {
  // Remove tudo que não for número
  const numeros = texto.replace(/\D/g, '');
  
  // Limita a 8 dígitos (DDMMAAAA)
  const numerosLimitados = numeros.slice(0, 8);
  
  // Formata a data
  if (numerosLimitados.length <= 2) {
    return numerosLimitados;
  } else if (numerosLimitados.length <= 4) {
    return `${numerosLimitados.slice(0, 2)}/${numerosLimitados.slice(2)}`;
  } else {
    return `${numerosLimitados.slice(0, 2)}/${numerosLimitados.slice(2, 4)}/${numerosLimitados.slice(4)}`;
  }
}

export function validarData(data: string): boolean {
  // Verifica se a data está no formato DD/MM/AAAA
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  if (!regex.test(data)) {
    return false;
  }

  // Extrai dia, mês e ano
  const [, dia, mes, ano] = data.match(regex) || [];
  const dataObj = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));

  // Verifica se a data é válida
  return (
    dataObj.getDate() === parseInt(dia) &&
    dataObj.getMonth() === parseInt(mes) - 1 &&
    dataObj.getFullYear() === parseInt(ano)
  );
}

export function formatarMoeda(valor: number): string {
  return (valor / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
} 