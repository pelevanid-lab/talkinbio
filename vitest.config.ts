import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    // .claude/ altında geçici agent worktree'leri oluşabiliyor (bkz. temizlenen
    // .claude/worktrees/jovial-kirch-9549df) — bunların içindeki test dosyaları
    // ayrı bir bağlamda yaşıyor ve toplanırsa sahte kırmızılar üretiyor.
    exclude: [...configDefaults.exclude, '**/.claude/**'],
  },
});
