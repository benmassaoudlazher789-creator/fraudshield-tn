import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Thème PrimeNG FraudShield : Aura avec une palette primaire centrée sur le bleu
 * institutionnel des maquettes (#1E3A8A en 500, utilisé par défaut par les composants).
 * Mode sombre (classe .fs-dark sur <html>) : surfaces bleu nuit alignées sur les tokens de styles.scss.
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
      color: 'var(--fs-focus)',
      offset: '2px',
    },
    colorScheme: {
      dark: {
        surface: {
          0: '#ffffff',
          50: '#e6eaf3',
          100: '#c9d0de',
          200: '#a7b0c4',
          300: '#8d97ab',
          400: '#6b7590',
          500: '#4c5670',
          600: '#323d56',
          700: '#2a3650',
          800: '#1a2338',
          900: '#131b2e',
          950: '#0b1120',
        },
        // Bleu éclairci : texte sombre dessus (contraste 7:1)
        primary: {
          color: '{primary.300}',
          contrastColor: '{surface.950}',
          hoverColor: '{primary.200}',
          activeColor: '{primary.100}',
        },
        // Texte secondaire (paginateur, placeholders…) : AA sur les surfaces sombres
        text: {
          mutedColor: '{surface.300}',
          hoverMutedColor: '{surface.200}',
        },
      },
    },
  },
});

export default FraudShieldPreset;
