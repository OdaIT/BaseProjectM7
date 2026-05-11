import { Type, GoogleGenAI } from '@google/genai';
import 'dotenv/config';

/**
 * ================================
 * 1. DEFINIÇÃO DAS FUNÇÕES (TOOLS)
 * ================================
 * Estas são as funções que o modelo pode "decidir" chamar.
 */

const powerDiscoBall = {
  name: 'power_disco_ball',
  description: 'Powers the spinning disco ball.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      power: {
        type: Type.BOOLEAN,
        description: 'Turn ON/OFF'
      }
    },
    required: ['power']
  }
};

const startMusic = {
  name: 'start_music',
  description: 'Play music.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      energetic: { type: Type.BOOLEAN },
      loud: { type: Type.BOOLEAN }
    },
    required: ['energetic', 'loud']
  }
};

const dimLights = {
  name: 'dim_lights',
  description: 'Dim lights.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      brightness: { type: Type.NUMBER }
    },
    required: ['brightness']
  }
};

const houseFns = [powerDiscoBall, startMusic, dimLights];

/**
 * ================================
 * 2. CONFIGURAÇÃO DO GEMINI
 * ================================
 */

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const chat = ai.chats.create({
  model: 'gemini-3-flash-preview',
  config: {
    tools: [{ functionDeclarations: houseFns }],
    toolConfig: {
      functionCallingConfig: {
        mode: 'auto'
      }
    }
  }
});

/**
 * ================================
 * 3. PRIMEIRA INTERAÇÃO
 * ================================
 */

let currentResponse = await chat.sendMessage({
  message: 'Turn this place into a party!'
});

console.log("\n🎯 Pedido inicial enviado");

/**
 * ================================
 * 4. LOOP DO AGENTE
 * ================================
 * O modelo pode:
 * - chamar funções
 * - pedir mais funções depois
 * - ou finalmente responder com texto
 */

let step = 1;
const MAX_STEPS = 5; // proteção contra loop infinito

while (currentResponse.functionCalls?.length && step <= MAX_STEPS) {
  console.log(`\n🔁 STEP ${step}`);
  console.log("Funções pedidas pelo modelo:");

  // Mostrar chamadas
  currentResponse.functionCalls.forEach(fn => {
    console.log(`➡️ ${fn.name}`, fn.args);
  });

  /**
   * ================================
   * 5. EXECUTAR FUNÇÕES (SIMULAÇÃO)
   * ================================
   */
  const functionResults = currentResponse.functionCalls.map(fn => {
    let result;

    switch (fn.name) {
      case 'power_disco_ball':
        result = { status: fn.args.power ? 'ON' : 'OFF' };
        break;

      case 'start_music':
        result = {
          playing: true,
          energetic: fn.args.energetic,
          loud: fn.args.loud
        };
        break;

      case 'dim_lights':
        result = { brightness: fn.args.brightness };
        break;

      default:
        result = { error: 'Unknown function' };
    }

    console.log(`✅ Executada: ${fn.name}`, result);

    return {
      name: fn.name,
      response: result
    };
  });

  /**
   * ================================
   * 6. DEVOLVER RESULTADOS AO MODELO
   * ================================
   */
  currentResponse = await chat.sendMessage({
    message: {
      role: 'tool',
      parts: functionResults.map(fr => ({
        functionResponse: fr
      }))
    }
  });

  step++;
}

/**
 * ================================
 * 7. RESPOSTA FINAL
 * ================================
 */

console.log("\n🏁 FINAL:");
console.log(currentResponse.text || "Sem texto final");