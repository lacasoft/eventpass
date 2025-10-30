module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nueva característica
        'fix',      // Corrección de bug
        'docs',     // Cambios en documentación
        'style',    // Cambios de formato (no afectan código)
        'refactor', // Refactorización de código
        'perf',     // Mejoras de rendimiento
        'test',     // Añadir o modificar tests
        'chore',    // Mantenimiento (dependencias, configs, etc)
        'revert',   // Revertir un commit anterior
        'build',    // Cambios en build system o dependencias
        'ci',       // Cambios en CI/CD
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-leading-blank': [1, 'always'],
    'footer-leading-blank': [1, 'always'],
  },
};
