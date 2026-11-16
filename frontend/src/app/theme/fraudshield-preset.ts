import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Thème PrimeNG FraudShield : Aura avec une palette primaire centrée sur le bleu
 * institutionnel des maquettes (#1E3A8A en 500, utilisé par défaut par les composants).
 */
const FraudShieldPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eef2fb',
      100: '#dce4f6',
      200: '#b9c8ec',
      300: '#8aa3dc',
      400: '#4f6fbf',
      500: '#1e3a8a',
      600: '#1b337a',
      700: '#172b67',
      800: '#132354',
      900: '#0f1b42',
      950: '#0a1230',
    },
    focusRing: {
      width: '2px',
      style: 'solid',
      color: '#3b82f6',
      offset: '2px',
    },
  },
});

export default FraudShieldPreset;
