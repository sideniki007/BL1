# 🔬 SCAN-BILLY-PACK — SUPPLEMENT (Дополнение)

**Дата:** 2026-05-24  
**Для:** Центр_20 + Центр_21  
**От:** 007  
**Основание:** Пропущенные/неполные данные из SCAN-BILLY-PACK.md (706 строк)

---

## 📋 Содержание

1. [SCAN-01: Lyrics DOM — дополнение](#scan-01-lyrics-dom--дополнение)
2. [SCAN-02: WagonTrain — дополнение](#scan-02-wagontrain--дополнение)
3. [SCAN-03: Z-Index Stack — дополнение](#scan-03-z-index-stack--дополнение)
4. [SCAN-04: App.tsx Render Tree — ASCII-дерево](#scan-04-apptsx-render-tree--ascii-дерево)
5. [SCAN-05: ControlDeck Ground Plane — точная геометрия](#scan-05-controldeck-ground-plane--точная-геометрия)
6. [SCAN-06: Practice System — celebrate-таблица](#scan-06-practice-system--celebrate-таблица)
7. [SCAN-07: Audio-Reactive Bridge — perf budget + vocal peak](#scan-07-audio-reactive-bridge--perf-budget--vocal-peak)
8. [SCAN-08: Event Bus — рекомендации по Billy](#scan-08-event-bus--рекомендации-по-billy)
9. [SCAN-09: CSS Vars — locomotion vars](#scan-09-css-vars--locomotion-vars)
10. [SCAN-10: BillyDock Verification — git diff HEAD~5..HEAD](#scan-10-billydock-verification--git-diff-head5head)

---

## SCAN-01: Lyrics DOM — дополнение

### Позиционирование RehearsalLyrics

```css
.root {
  position: fixed;
  top: calc(var(--react-header-height, 48px) + var(--wagon-train-height, 0px));
  left: 0;
  right: 0;
  bottom: var(--bl-deck-height, 76px);
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  background: transparent;
  overflow: hidden;
}
```

- **z-index**: 5 (НЕ 0, исправляет оригинальный SCAN-01)
- **Позиционирование**: `fixed`, растянут на весь экран минус header + wagon (top) и deck (bottom)
- **Флекс**: column, align-items: center, justify-content: flex-start

### Плашка (".activeBlock", не ".root")

```css
.activeBlock {
  position: relative;   /* ← stacking context НЕ создаёт */
  z-index: 1;          /* ↑ перекрывает slotContainer(z-index:0) */
  background: var(--plate-bg, rgba(0, 0, 0, 0.5));
  backdrop-filter: blur(12px);  /* ⚠️ может создать stacking context в Safari */
  border: 1px solid var(--bl-cover-border, rgba(255, 255, 255, 0.08));
  border-radius: var(--bl-radius-lg, 12px);
  padding: 24px 40px;
  width: 80%;
  max-width: 900px;
  flex: 1;
  overflow: hidden;
  text-align: center;
}
```

- **z-index плашки**: 1
- **Refs**:
  - `rootRef: useRef<HTMLDivElement>(null)` — на `.root`
  - `activeBlockRef: useRef<HTMLDivElement>(null)` — на `.activeBlock`
  - `activeRef: useRef<HTMLDivElement>(null)` — на активную `.line` (legacy scroll mode)
  - `overlayRef: useRef<HTMLDivElement>(null)` — на `.previewOverlay`
  - `bcRef: useRef<HTMLDivElement>(null)` — на `.blockCue`
- **ClassName контейнера**: `styles.root` → `.root` в CSS module
- **Позиционирование строк**:
  - Grid mode: `.slotContainer` с `display: grid`, `grid-template-rows` (inline)
  - Flex fallback: `.scrollContainer` с `overflow-y: auto`, строки `<div>` с вертикальным стэком
  - Промежутки: `gap: var(--bl-slot-gap, 16px)` между строками

### Скролл к активной строке

```typescript
// RehearsalLyrics.tsx:651
if (!displayBlock && activeRef.current) {
  activeRef.current.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
}
```

- Используется **только** в legacy (flex) режиме
- При activeBlock = `null` вызывает `scrollIntoView({ block: 'center' })`
- В grid/overlay режиме строки центрируются через `align-content: center` — скролл не нужен

### Классы и data-атрибуты строки

```html
<div
  class="[styles.line]"
  data-line-index={slot.lineIndex}
  data-slot-id={slot.id}
  data-active="true"                          <!-- текущая линия -->
  data-is-preview="true"                      <!-- preview-слот -->
  data-grow-cue="true"                        <!-- растёт перед переходом -->
  data-block-type={displayBlock.type}         <!-- verse/chorus/bridge/... -->
  data-word-fx-mode="progress"                <!-- word FX режим -->
  data-reactive-words="true"                  <!-- word-sync активен -->
  data-line-next="true"                       <!-- следующая линия -->
  data-line-next-level="hint"                 <!-- guide/hint/off -->
</>
```

---

## SCAN-02: WagonTrain — дополнение

### Полный CSS WagonTrain

```css
.root {
  position: fixed;
  top: var(--react-header-height, 48px);
  left: 0;
  z-index: 10;
  display: flex;
  align-items: stretch;
  gap: var(--bl-spacing-sm, 8px);
  flex-wrap: nowrap;
  padding: 2px 12px;
  width: 100%;
  max-width: calc(100vw - 24px);
  overflow-x: auto;
  scrollbar-width: none;
  background: var(--bl-cover-bg-tint, var(--bl-surface-sunken, rgba(20,20,20,0.35)));
  backdrop-filter: blur(4px);     /* ⚠️ stacking context */
  border-radius: 12px;
}
```

- **Высота**: `min-height: 34px` (на .wagon), реальная высота зависит от контента
- **Публикует** `--wagon-train-height` через ResizeObserver → удаляет при unmount
- **Mode switch**: рендерится ТОЛЬКО при `mode === 'rehearsal' && !syncOpen` (App.tsx:103-109)

### JSX-структура wagon'а

```html
<button className={styles.wagon}
  data-block-type="verse"
  data-active="true"
  data-in-loop="true"
  data-has-sub-blocks="true"
  onClick={handleWagonClick}
>
  <span className={styles.title}>Verse 1</span>
  {isMulti && (
    <div className={styles.subSegments}>
      <div className={styles.subSegmentWrapper}>
        <div className={styles.subSegment}
          data-sub-active="true"
          data-in-loop="true"
        />
        <span className={styles.subLoopToggle}>−</span>
      </div>
    </div>
  )}
  <span className={styles.loopToggle}
    data-active="true"
    data-loop-state="in-loop"
  >−</span>
</button>
```

### Scroll к активному wagon'у

```typescript
// WagonTrain.tsx:70-79
useEffect(() => {
  const el = rootRef.current;
  if (!el || !activeBlock) return;
  const active = el.querySelector('[data-active="true"]') as HTMLElement;
  if (active) {
    const left = active.offsetLeft - el.offsetWidth / 2 + active.offsetWidth / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }
}, [activeBlock?.id]);
```

- Центрирует активный wagon через `scrollTo()` с `behavior: 'smooth'`
- Пересчитывается при смене `activeBlock.id`

### Refs
- `rootRef: useRef<HTMLDivElement>(null)` — на `.root`

---

## SCAN-03: Z-Index Stack — дополнение

### Недостающие z-index значения

| Элемент | z-index | Источник | Примечание |
|---------|---------|----------|-----------|
| **ExerciseStrip** | **—** (inline) | `ExerciseStrip.tsx` | Не задаёт z-index. Использует `display: flex`, inline styles. Родительский z-index наследуется |
| **SyncEditorPanel** | **90** | `SyncEditorPanel.tsx:796` | Inline `zIndex: 90`. `position: fixed; bottom: 0; height: 240px` |
| **RehearsalLyrics .previewOverlay** | 20 | CSS module:321 | Активен при travel |
| **RehearsalLyrics .loopBoundary** | 20 | CSS module:582 | Drag boundaries |
| **RehearsalLyrics .blockCue** | 2 | CSS module:213 | Нижняя подсказка |
| **WagonTrain .subLoopToggle** | 3 | CSS module:357 | Кнопка sub-loop |
| **WagonTrain .subSegments** | 2 | CSS module:270 | Полоски сегментов |

### Stacking Context

Следующие элементы **создают новый stacking context** (важно для z-index):

| Элемент | Причина | Потенциальная проблема |
|---------|---------|----------------------|
| `WagonTrain .root` | `backdrop-filter: blur(4px)` | Дети с z-index начинают отсчёт от его контекста |
| `RehearsalLyrics .activeBlock` | `backdrop-filter: blur(12px)` | z-index:1 работает ВНУТРИ этого контекста |
| `RehearsalLyrics .previewOverlay` | `position: fixed` + `top` | Новый контекст, z-index:20 |
| `BillyDock .root` | `position: fixed` + `z-index: 999996` | Свой контекст |
| `ControlDeck .root` | `position: fixed` + `z-index: 999995` | Свой контекст |
| `TrackInfoBoard` | `position: fixed` + `z-index: 999997` | Свой контекст |

### BillyDock в DOM-дереве

```html
<div id="belive-react">
  ...
  <SyncEditorPanel />  <!-- syncOpen=true, z-index:90 -->
  <!-- ИЛИ -->
  <ControlDeck />      <!-- syncOpen=false, z-index:999995 -->

  <BillyDock />        <!-- z-index:999996, ПОСЛЕДНИЙ main sibling -->
  <TriggerDebugOverlay />
  <PlaybackPerfOverlay />
  <TrackInfoBoard />   <!-- conditional, z-index:999997 -->
  <AiSettingsModal />  <!-- conditional, z-index:999999 -->
</div>
```

- BillyDock — **последний безусловный sibling** в `<div id="belive-react">`
- После него только условные компоненты (overlays, модалки)
- Header (z-index: 999996) — ПЕРВЫЙ sibling, BillyDock — ПОСЛЕДНИЙ. В DOM порядке BillyDock будет поверх Header (позже в дереве)

---

## SCAN-04: App.tsx Render Tree — ASCII-дерево

```html
<div id="belive-react" data-track-info="active|inactive">
  │
  ├── <BlockEditorModal />           (z-index: 9999)
  ├── <Header />                     (z-index: 999996, inline)
  │   └── публикует --react-header-height
  │
  ├── <CatalogPanel />               (библиотека треков)
  │
  ├── ═══ [mode === 'rehearsal' && !syncOpen] ═══
  │   ├── <div data-wagon-train-wrapper>
  │   │   └── <WagonTrain />        (z-index: 10, fixed top)
  │   └── <RehearsalLyrics />        (z-index: 5, fixed)
  │
  ├── ═══ [syncOpen] ═══
  │   └── <SyncLyrics />             (альтернативный рендер текста)
  │
  ├── ═══ [mode === 'karaoke' || mode === 'concert'] ═══
  │   └── <KaraokeLyricsBoard />     (z-index: 50)
  │
  ├── <CameraPreview />              (z-index: 1)
  ├── <LiveSubtitle />               (z-index: 100)
  ├── <LiveControls />               (z-index: 150)
  │
  ├── ═══ [syncOpen] ═══
  │   └── <SyncEditorPanel />        (z-index: 90, position:fixed bottom)
  │
  ├── ═══ [!syncOpen] ═══
  │   └── <ControlDeck />            (z-index: 999995, position:fixed bottom)
  │
  ├── <BillyDock />                  (z-index: 999996, position:fixed)
  ├── <TriggerDebugOverlay />
  ├── <PlaybackPerfOverlay />
  │
  ├── ═══ [trackInfoOpen] ═══
  │   └── <TrackInfoBoard />         (z-index: 999997)
  │
  └── ═══ [aiSettingsOpen] ═══
      └── <AiSettingsModal />        (z-index: 999999)
```

### Порядок инициализации bridges (main.tsx)

```
DOMContentLoaded →
  1. initMonitorBridge()
  2. initModeSwitchBridge()
  3. render(<App />, #root)          ← React рендер
  4. initTriggerBridge()              ← Scheduler lifecycle
  5. initAudioReactiveBridge()        ← Detector+Writer
  6. initExerciseBridge()             ← Practice interruption
  7. initMarkerBridge()
  8. initLoopBridge()
  9. initTrackBridge()
  10. initAudioBridge()
  11. initBlocksBridge()
  12. initCoverThemeBridge()
  13. initLyricsBridge()
  14. initStemReactiveBridge()
```

### App.tsx bridges (useEffect в компоненте)

```
App mount →
  tryActivateV2()
  initTrackEventListeners()
  initAudioBridge()
  initLyricsBridge()
  initMarkersBridge()
  initModeBridge()
  initTrackBridge()
  initCoverThemeBridge()
  initSyncBridge()
  initTimeSync()
  initTriggerBridge()
  initStemReactiveBridge()
  initTextStyleBridge()
  initPlateBridge()
  initPerformanceBridge()
  initTakesBridge()
  initExerciseBridge()
  initMonitorBridge()
```

---

## SCAN-05: ControlDeck Ground Plane — точная геометрия

### Полный CSS ControlDeck

```css
.root {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999995;
  display: flex;
  flex-direction: column;
  background: var(--bl-surface-base, #0a0a14);
  border-top: 1px solid var(--bl-border-subtle, rgba(255,255,255,0.1));
}
```

### Геометрия

| Состояние | Высота | Описание |
|-----------|--------|----------|
| **Collapsed** | `min-height: 28px` | Только `.handle` (drag-полоска) |
| **Expanded** | `28px + 240px = 268px` | Handle + `.panel` высотой `var(--bl-deck-panel, 240px)` |
| **Sync открыт** | — | ControlDeck НЕ рендерится. SyncEditorPanel (z-index:90) вместо него |

### --bl-deck-height публикация

```typescript
// ControlDeck.tsx:63-78
useEffect(() => {
  const el = rootRef.current;
  if (!el) return;
  const ro = new ResizeObserver(([entry]) => {
    document.documentElement.style.setProperty(
      '--bl-deck-height', `${entry.contentRect.height}px`
    );
  });
  ro.observe(el);
  return () => {
    ro.disconnect();
    // НЕ удаляем --bl-deck-height — BillyDock зависит
  };
}, []);
```

- `--bl-deck-height` **публикуется** ✅
- `--bl-deck-top` **НЕ публикуется** ❌
- **Lifetime**: не удаляется при unmount (осознанное решение)
- **Sync mode**: SyncEditorPanel НЕ публикует --bl-deck-height (в оригинальном SCAN-05 сказано "SyncEditorPanel также публикует эту var — покрытие есть", но в коде SyncEditorPanel этого нет)

### BillyDock bottom зависит от --bl-deck-height

```css
/* BillyDock.module.css:7 */
bottom: calc(var(--bl-deck-height, 48px) - 10px);
```

Fallback: `48px`, когда ControlDeck не смонтирован (sync mode).

---

## SCAN-06: Practice System — celebrate-таблица

### Точки для вставки `billy:celebrate`

| # | Файл | Строка | Функция | Что происходит | Можно вставить celebrate? |
|---|------|--------|---------|---------------|--------------------------|
| 1 | `exercise.store.ts` | 320-362 | `completeExercise()` | Упражнение завершено → `phase: 'exercise-complete'` | ✅ **P0** — после set, когда фаза exercise-complete |
| 2 | `practice-session.store.ts` | 380 | `nextPass()` | pass завершён → `emitPracticeEvent('pass-complete')` | ✅ **P0** — каждый pass (для streak celebration) |
| 3 | `practice-session.store.ts` | 384-392 | `nextPass()` → complete check | Все pass'ы завершены → `emitPracticeEvent('completed')` | ✅ **P0** — финальное завершение практики |
| 4 | `practice-session.store.ts` | 412-434 | `completePractice()` | Принудительное завершение → `practiceStatus: 'completed'` | ✅ **P1** — если пользователь нажал "Done" |
| 5 | `exercise.recipes.ts` | — | `generator` | Определённое количество rounds завершено | ⏳ **P2** — через completeExercise уже покрыто |
| 6 | `exercise.store.ts` | 210-292 | `advanceToNextStep()` | Раунд завершён (roundCompleted=true) | ⏳ **P2** — промежуточная точка |

### P0 точки (рекомендуется в первую очередь)

```typescript
// 1. exercise.store.ts:320 — completeExercise()
// После set({ phase: 'exercise-complete', completionMoment })
// → dispatchEvent(new CustomEvent('billy:celebrate', {
//     detail: { type: 'exercise-complete', recipeId, name, icon }
//   }))

// 2. practice-session.store.ts:380 — nextPass() pass-complete
// После emitPracticeEvent('pass-complete', { passesCount, currentRate })
// → dispatchEvent(new CustomEvent('billy:celebrate', {
//     detail: { type: 'pass-complete', passesCount, currentRate }
//   }))

// 3. practice-session.store.ts:392 — nextPass() complete
// После emitPracticeEvent('completed', { passesCount })
// → dispatchEvent(new CustomEvent('billy:celebrate', {
//     detail: { type: 'practice-complete', passesCount }
//   }))
```

### exercise.recipes.ts — структура

```typescript
// 10 рецептов (через генераторы):
interface RecipeDef {
  id: string;
  name: string;
  icon: string;
  category: 'drill' | 'challenge';
  description: string;
  defaultRounds: number;
  defaultBacking: BackingMode;
  surface: 'stable' | 'smoke' | 'special';
  capabilities?: CapabilityMetadata;
  generate: (blockId: string, params?: RecipeParams) => Exercise;
}
```

**Зарегистрированные рецепты:**
1. `echoDrill` — Echo Drill (Id: echo)
2. `repeat3TakeChallenge` — 3-Take Challenge (Id: fill-select)
3. `callAndResponse` — Call & Response (Id: call-response)
4. `backingOnlyDrill` — Backing-Only Drill
5. `acappellaBossChallenge` — Acappella Boss Challenge
6. `tempoLadderChallenge` — Tempo Ladder Challenge
7. `tradeDrill` — Trade Drill

### exercise.bridge.ts — полный код

```typescript
// exercise.bridge.ts (34 строки)
export function initExerciseBridge(): () => void {
  const handleTrackChange = () => {
    useExerciseStore.getState().cancelExercise();
  };
  document.addEventListener('before-track-change', handleTrackChange);

  let prevIsRecording = useTakesStore.getState().isRecording;
  const unsubTakes = useTakesStore.subscribe((state) => {
    const isRecording = state.isRecording;
    const exercise = useExerciseStore.getState();
    if (!prevIsRecording && isRecording && exercise.phase === 'pre-recording') {
      exercise.setPhase('recording');
    }
    if (prevIsRecording && !isRecording && exercise.phase === 'recording') {
      exercise.onStepCompleted();
    }
    prevIsRecording = isRecording;
  });

  return () => {
    document.removeEventListener('before-track-change', handleTrackChange);
    unsubTakes();
  };
}
```

### exercises файлы (полный список — 24 файла)

```
src/exercises/
├── index.ts
├── exercise.types.ts           (типы: Exercise, ExercisePhase, Quest, ...)
├── exercise.schema.ts          (валидация схемы)
├── exercise.store.ts           (459 строк, Zustand — startRecipe, startExercise, cancelExercise, completeExercise)
├── exercise.runtime.ts         (advanceExerciseCursor, getPhaseForStepAction, ...)
├── exercise.runtime.test.ts
├── exercise.runtime.lock.test.ts
├── exercise.runtime.mutation-lock.test.ts
├── exercise.runtime.seek-guard.test.ts
├── exercise.runtime.strip-guard.test.ts
├── exercise.runtime.wagon-guard.test.ts
├── exercise.recipes.ts         (рецепты + генераторы)
├── exercise.recipes.surface.test.ts
├── exercise.interruption.ts    (interruptPracticeSession, registry)
├── exercise.interruption.test.ts
├── exercise.bridge.ts          (связь с takesStore)
├── exercise.validator.ts       (валидатор)
├── exercise.scope-resolver.ts  (резолвер области)
├── components/
│   ├── ExerciseStrip.tsx       (146 строк, inline styles, Escape handler)
│   ├── QuestEntrySurface.tsx
│   ├── QuestCompletionMoment.tsx
│   └── RecipeCardPopover.tsx
├── generators/
│   ├── index.ts
│   ├── generator.types.ts
│   ├── generator.registry.ts
│   ├── echo.generator.ts
│   ├── fill-select.generator.ts
│   ├── trade.generator.ts
│   ├── tempo-ladder.generator.ts
│   ├── backing-ladder.generator.ts
│   └── echo.generator.ts
```

---

## SCAN-07: Audio-Reactive Bridge — perf budget + vocal peak

### Perf Budget

| Метрика | Значение | Примечание |
|---------|----------|-----------|
| **AnalyserNode fftSize** | 256 | → 128 frequency bins |
| **smoothingTimeConstant** | 0.8 | Сильное сглаживание |
| **Частота вычислений** | ~30fps | Управляется PlaybackVisualScheduler |
| **Цикл по bins** | 128 итераций | 3 группы: bass(0-10%), mid(10-40%), high(40-100%) |
| **Выделение памяти** | Uint8Array(128) | Создаётся 1 раз при setup |
| **CSS batch** | `queueCssVar()` | Scheduler batch flush |
| **Оценка затрат** | **<0.05ms/frame** | Ничтожно — 128 умножений/сложений |

### Можно ли добавить vocal peak detector?

**Текущая архитектура:**
```
audioEngine.stereoMerger → analyser (fft=256)
// ИЛИ
audioEngine.instrumentalGain → analyser (fft=256)
```

**Проблема:** analyser подключён к stereoMerger ИЛИ instrumentalGain — **не к vocal stem**.  
**Решение:** Нужен отдельный analyser на vocal stem:
```
audioEngine.vocalGain → vocalAnalyser (fft=128 или 64, для экономии)
```

**Рекомендуемые изменения:**

```typescript
// Добавить второй AnalyserNode для вокала
let vocalAnalyser: AnalyserNode | null = null;
let vocalData: Uint8Array | null = null;

function setupVocal(): boolean {
  const ae = (window as any).audioEngine;
  if (!ae?.audioContext || !ae.vocalGain) return false;
  vocalAnalyser = ae.audioContext.createAnalyser();
  vocalAnalyser.fftSize = 128;  // Меньше — только для вокала
  vocalAnalyser.smoothingTimeConstant = 0.85;
  vocalData = new Uint8Array(vocalAnalyser.frequencyBinCount);
  ae.vocalGain.connect(vocalAnalyser);
  return true;
}
```

**Стоимость:** +1 AnalyserNode, +64 bins, ~0.02ms/frame — negligible.

### --bl-stem-vocals-energy

- **Не публикуется** audio-reactive bridge ❌
- `useBillyAudioReactive.ts` читает её с fallback на `--bl-audio-energy`
- **Рекомендация:** добавить публикацию `--bl-stem-vocals-energy` в writer audio-reactive bridge (или в новый vocal analyser)

---

## SCAN-08: Event Bus — рекомендации по Billy

### Какие события Billy уже использует

| Событие | Consumer | Действие |
|---------|----------|----------|
| `before-track-change` | `trackInfo.store` (в файле) | close + clearAiMessages + setActiveExpert(null) |
| `before-track-change` | `practice-session.store` | cancelPractice |
| `playback-state-changed` | `audio-reactive.bridge` | setup/teardown analyser |
| `playback-rate-changed` | `practice-session.store` | safety sync |

### Какие события Billy ДОЛЖЕН слушать (новые подписки)

| Событие | Зачем | Рекомендуемый consumer |
|---------|-------|----------------------|
| `practice:completed` | Билли празднует завершение практики | Новый `billy-celebrate.bridge` или `useBillyCelebrate` |
| `practice:pass-complete` | Билли подбадривает после каждого pass'а | Там же |
| `practice:cancelled` | Билли говорит "ничего страшного" | Там же |
| `mode-changed` | Билли может менять анимацию/поведение при смене режима | `useBillyState` (уже через store) |
| `loopcompleted` | Билли замечает завершение цикла | `useBillyAudioReactive` |

### Какие события Billy может эмитить (новые)

| Событие | Payload | Эмиттер | Слушатель |
|---------|---------|---------|-----------|
| `billy:celebrate` | `{ type: 'pass-complete' \| 'practice-complete' \| 'exercise-complete', ... }` | `practice-session.store` / `exercise.store` | BillyDock (анимация dance) |
| `billy:dismissed` | — | BillyDock (если добавить кнопку закрытия) | trackInfo.store (billyCollapsed) |

---

## SCAN-09: CSS Vars — locomotion vars

### Vars которые нужно ДОБАВИТЬ для Billy Position Engine

| CSS Var | Зачем | Кто будет публиковать |
|---------|-------|---------------------|
| `--bl-plaque-top` | Y-позиция верхнего края плашки (viewport px) | RehearsalLyrics (новый ResizeObserver или rAF) |
| `--bl-plaque-height` | Высота плашки (px) | RehearsalLyrics |
| `--bl-plaque-left` | X-позиция левого края плашки (viewport px) | RehearsalLyrics |
| `--bl-plaque-width` | Ширина плашки (px) | RehearsalLyrics |
| `--bl-wagon-top` | Y-позиция WagonTrain (viewport px) | WagonTrain |
| `--bl-wagon-height` | Высота WagonTrain (px) | WagonTrain (уже публикует `--wagon-train-height`) |
| `--bl-deck-top` | Y-позиция верхнего края ControlDeck (viewport px) | ControlDeck |

### Рекомендуемая архитектура публикации

```typescript
// WagonTrain.tsx — уже публикует --wagon-train-height, добавить top
useEffect(() => {
  const el = rootRef.current;
  if (!el) return;
  const ro = new ResizeObserver(([entry]) => {
    const rect = el.getBoundingClientRect();
    document.documentElement.style.setProperty('--wagon-train-height', `${entry.contentRect.height}px`);
    document.documentElement.style.setProperty('--bl-wagon-top', `${rect.top}px`);
  });
  ro.observe(el);
  // ...
}, []);

// RehearsalLyrics — NEW ResizeObserver на activeBlockRef
useEffect(() => {
  const el = activeBlockRef.current;
  if (!el) return;
  const ro = new ResizeObserver(([entry]) => {
    const rect = el.getBoundingClientRect();
    document.documentElement.style.setProperty('--bl-plaque-top', `${rect.top}px`);
    document.documentElement.style.setProperty('--bl-plaque-height', `${entry.contentRect.height}px`);
    document.documentElement.style.setProperty('--bl-plaque-left', `${rect.left}px`);
    document.documentElement.style.setProperty('--bl-plaque-width', `${entry.contentRect.width}px`);
  });
  ro.observe(el);
  return () => ro.disconnect();
}, [displayBlock?.id, plateWidth, platePosition]);
```

### Источники (setProperty) — полная таблица

| CSS Var | Файл | Строка | Значение | Частота |
|---------|------|--------|----------|---------|
| `--bl-audio-energy` | `audio-reactive.bridge.ts` | 107 | 0..1 | ~30fps |
| `--bl-audio-bass` | `audio-reactive.bridge.ts` | 108 | 0..1 | ~30fps |
| `--bl-audio-mid` | `audio-reactive.bridge.ts` | 109 | 0..1 | ~30fps |
| `--bl-audio-high` | `audio-reactive.bridge.ts` | 110 | 0..1 | ~30fps |
| `--bl-audio-beat` | `audio-reactive.bridge.ts` | 111 | 0..1(decay) | ~30fps |
| `--react-header-height` | `Header.tsx` | 25 | px | по событию |
| `--bl-deck-height` | `ControlDeck.tsx` | 68 | px | по событию |
| `--wagon-train-height` | `WagonTrain.tsx` | 60 | px | по событию |
| `--bl-billy-block-color` | `BillyDock.tsx` | 282 | color | при смене блока |
| `--bl-ps-*` (16 vars) | `RehearsalLyrics.tsx` | 113-131 | transition presets | при смене preset'а |
| `--bl-line-word-opacity` | `RehearsalLyrics.tsx` | 706 | 0.35/0.8/0.6 | при смене level |
| `--bl-line-word-color` | `RehearsalLyrics.tsx` | 707 | color | при смене level |
| `--bl-preview-opacity` | `RehearsalLyrics.tsx` | 728 | 0.35/0.55/0.85 | при смене level |
| `--bl-preview-color` | `RehearsalLyrics.tsx` | 729 | rgba | при смене блока |
| `--bl-preview-weight` | `RehearsalLyrics.tsx` | 730 | 400/400/500 | при смене level |
| `--plate-cue-x` | `RehearsalLyrics.tsx` | 769 | px | rAF |
| `--plate-cue-top` | `RehearsalLyrics.tsx` | 1039 | px | при смене блока |
| `--bl-bc-font-size` | `RehearsalLyrics.tsx` | 1040 | rem | при смене блока |

---

## SCAN-10: BillyDock Verification — git diff HEAD~5..HEAD

### Результат проверки

| Файл | Статус | Строк | Изменения |
|------|--------|-------|-----------|
| `BillyDock.tsx` | **NEW** | 258 | Полностью новый файл |
| `BillyDock.module.css` | **NEW** | 467 | Полностью новый файл |
| `useBillyState.ts` | **NEW** | 51 | Полностью новый файл |
| `useBillyAudioReactive.ts` | **NEW** | 187 | Полностью новый файл |
| `BillyChatModule.tsx` | **NEW** | 18 | Полностью новый файл |
| `trackInfo.store.ts` | **MODIFIED** | +3 строки | Добавлены: `billyCollapsed`, `setBillyCollapsed` |
| `deck.store.ts` | **MODIFIED** | — | persist middleware, partialize |
| `deck/modules.ts` | **MODIFIED** | — | billy tab registration |

### trackInfo.store.ts — точные изменения

```diff
+ import { persist } from 'zustand/middleware';
  // Billy Dock (Phase 1.5)
+ billyCollapsed: boolean;
+ setBillyCollapsed: (v: boolean) => void;
```

### deck.store.ts — ключевой diff

```diff
+ persist(
    (set) => ({ ... }),
+   { name: 'bl-deck', partialize: (s) => ({ expanded: s.expanded, activeTabId: s.activeTabId }) }
  )
```

### deck/modules.ts — новый модуль billy

```typescript
registerModule({
  id: 'billy',
  label: '🤖',
  order: 45,
  modes: ['rehearsal', 'karaoke', 'concert', 'live'],
  load: () => import('./BillyChatModule').then(m => ({ default: m.BillyChatModule })),
});
```

---

## 📊 Сводка по дополнению

| Скан | Новых данных | Ключевые находки |
|------|-------------|------------------|
| SCAN-01 | 5 параграфов | z-index:5 у .root, scrollIntoView, 10 data-атрибутов |
| SCAN-02 | 3 параграфа | JSX структура, mode rehearsal-only, --wagon-train-height |
| SCAN-03 | 3 таблицы | SyncEditorPanel z-index:90, 5 stacking contexts |
| SCAN-04 | 2 диаграммы | Полное ASCII-дерево, 14 bridges инициализации |
| SCAN-05 | Таблица геометрии | Collapsed: 28px, Expanded: 268px |
| SCAN-06 | 6 точек celebrate + 24 файла | P0: completeExercise, nextPass pass-complete, practice-complete |
| SCAN-07 | Perf table + vocal peak plan | <0.05ms/frame, нужен отдельный vocal analyser |
| SCAN-08 | 2 таблицы | 6 событий слушать, 2 эмитить |
| SCAN-09 | 7 новых vars + полная таблица | 19 setProperty источников |
| SCAN-10 | 7 файлов verified | trackInfo.store: +3 строки, 5 новых файлов |

---

## 🚨 Дополнительные RED FLAGS

### 1. SyncEditorPanel z-index: 90
SyncEditorPanel (`z-index: 90`) **ниже** RehearsalLyrics (`z-index: 5`)? Нет — они взаимоисключающие (syncOpen vs rehearsal). Но если syncOpen при rehearsal mode — SyncEditorPanel (90) будет над wagon Train (10).

### 2. BillyCollapsed — только поле, нет логики
`trackInfo.store` содержит `billyCollapsed: boolean` и `setBillyCollapsed`, но **никто не использует** его для реального сворачивания BillyDock. Это stub для Phase 1.5.

### 3. ExerciseStrip z-index не определён
ExerciseStrip использует inline styles без z-index. При рендеринге его позиция в DOM определяет stacking — нужно проверить, не перекрывается ли он другими элементами.

### 4. --bl-deck-height fallback при sync mode
SyncEditorPanel не публикует `--bl-deck-height`. BillyDock использует fallback `48px`. Это может быть неточно — SyncEditorPanel имеет height 240px + controls.
