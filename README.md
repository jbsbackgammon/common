# JBS ブランド管理（common）

GitHubリポジトリ `jbsbackgammon/common` / ページ名「ブランド管理」。

- 管理画面: https://jbsbackgammon.github.io/common/
- 共通設定（正本）: https://jbsbackgammon.github.io/common/data/brand.json
- ブラウザ共通ライブラリ（大会情報）: https://jbsbackgammon.github.io/common/brand.js
- ブラウザ共通ライブラリ（保存・出力命名）: https://jbsbackgammon.github.io/common/naming.js

## 公開と運用

ブランド管理ページは**閲覧専用**です。大会名・英語表記・回次等・分類・テーマカラー・サブカラー・文字色判定ルールを表示します。ヘッダーの操作ボタン、編集欄、ドラッグ並び替え、削除、JSON取込・出力、PATによる保存機能は設置していません。

- 大会情報の正本: `data/brand.json`。現在の大会情報とルールを固定し、ページから編集できない構成です。
- 回次表示: 盤聖戦と賽王戦は毎年7月1日（日本時間）、その他の大会は毎年1月1日（日本時間）に自動で1加算します。
- ツール共通CSS: `ui.css`（v46）。ブランド管理ページは固有CSSを使用せず、共通CSSのみで表示します。ページ下部に共通変数・共通スタイルの定義値と、文字色の自動判定ルールをまとめています。
- 将来必要になった場合のメンテナンスはGitHubのファイル修正・コードレビューを通じて実施します。

### GitHub Pages

1. GitHubリポジトリの **Settings → Pages → Build and deployment → Source: GitHub Actions** を選択します。
2. `main` ブランチにPushすると `.github/workflows/deploy.yml` が実行され、https://jbsbackgammon.github.io/common/ に公開されます。手動実行も可能です。
3. OSは `ubuntu-24.04` 固定、ActionsはNode.js 24対応世代を使用しています。公開前にJSON構文と共通命名APIを検証します。

## 外部ツールからの参照

3つの既存ツール（thumbnail / tournament / overlay）は、すべて `jbsbackgammon.github.io` 上にあり、パスだけが異なります。次の共通JSを読み込むことで、同じ `data/brand.json` を参照できます。

```html
<script src="https://jbsbackgammon.github.io/common/brand.js"></script>
<script>
  async function initialize() {
    try {
      await JBSBrand.load();
      const master = JBSBrand.getTournament('王位戦');
      const mainColor = master.color;           // "#0D6B2F"
      const english = master.nameEn;            // "OUI"
      const edition = JBSBrand.getEdition('王位戦'); // 2026: JBS 第33期 / 2027: JBS 第34期
      const subColor = master.subColor;        // メイン色に白を32%混ぜた初期色
      const textColor = JBSBrand.getTextColor(mainColor); // "#FFFFFF"
      console.log({ mainColor, english, textColor });
    } catch (error) {
      // 通信失敗時には各ツールの既存ローカル設定で動作を継続してください。
      console.warn('JBS common 設定を読み込めませんでした', error);
    }
  }
  initialize();
</script>
```

`type="module"` のアプリからも使用できます。既存の `brand.js` を先に通常の `<script>` で読み込んだ後、アプリの初期化前に `await window.JBSBrand.load()` を実行してください。

### 公開API

| 関数 | 戻り値・内容 |
| --- | --- |
| `await JBSBrand.load()` | 公開JSONを取得。既に取得済みならキャッシュのコピーを返す |
| `await JBSBrand.load({force:true})` | JSONの再取得（再読み込み用） |
| `JBSBrand.getTournaments()` | `order` 昇順の大会一覧（コピー） |
| `JBSBrand.getTournament(nameOrId)` | ID、日本語名、英語名のいずれかで大会を取得（見つからない場合は `null`） |
| `JBSBrand.getEdition(nameOrId, year?)` | 現在日時の回次。年指定ならその年の更新日後の回次。未登録なら `null` |
| `JBSBrand.editionForYear(entry, year?)` | 指定年の更新日後の回次（省略時は現在日時）。未入力なら空文字 |
| `JBSBrand.editionForDate(entry, date?)` | 指定日時（Dateオブジェクト）の実際の回次を日本時間で計算 |
| `JBSBrand.editionCycleYear(entry, date?)` | 指定日時が属する回次更新年度を取得（7月更新にも対応） |
| `JBSBrand.getColor(nameOrId, fallback)` | テーマカラー。未登録の場合は `fallback`（省略時 `null`） |
| `JBSBrand.getSubColor(nameOrId, fallback)` | サブカラー。未登録の場合は `fallback`（省略時 `null`） |
| `JBSBrand.makeSubColor(mainColor)` | テーマカラーに白を32%混ぜたサブカラー初期値 |
| `JBSBrand.getTextColor(hex, fallback)` | 現在の共通ルールで前景色を判定。HEX不正時は `fallback` |
| `JBSBrand.applyContrast(element, backgroundColor)` | 共通CSS `.jbsui-auto-contrast` を付与し、背景色・文字色のCSS変数を設定する。成功時 `true` |
| `JBSBrand.getContrast()` | 文字色判定ルールのコピー |
| `JBSBrand.getConfig()` | 共通設定全体のコピー |
| `JBSBrand.validate(object)` | スキーマを検証して正規化した設定のコピーを返す |

**注意:** `load()` 完了前の `getTournament()` は `null` を返します。ブラウザの通信が失敗したときに画面が壊れないよう、各ツールでは独自の既定値（既存マスタ）を残して段階的に移行してください。新しい共通設定の反映には、GitHub PagesにJSONが公開されてからツールを開き直す必要があります。

### 移行対象と維持対象

| 既存ツール | 共通化する値 | ツール内で維持する値 |
| --- | --- | --- |
| thumbnail | `SERIES`、`OPEN_SERIES` のカラー・サブカラー、文字色判定 | 影、画像処理、レイアウト |
| tournament | `TOURNAMENT_MASTERS` の名前・メイン/サブカラー、判定できる文字色 | `TITLE_COLORS`（5大タイトルの装飾）、PDF・PNG描画、トーナメントロジック |
| overlay | `titleThemePresets`、`titleEnglishPresets`、メイン/サブカラー、共通文字色判定 | ボードプリセット、パネルカラー、選手配色、描画・配置 |

各ツールでの利用にあたっては、公開済みの共通APIを参照してください。ブランド管理ページ自体は閲覧専用です。

## JSONスキーマ v1

```json
{
  "schemaVersion": 1,
  "tournaments": [
    {
      "id": "oui",
      "name": "王位戦",
      "nameEn": "OUI",
      "category": "title",
      "editionBaseYear": 2026,
      "editionBase": "JBS 第33期",
      "editionUpdateMonth": 1,
      "editionUpdateDay": 1,
      "color": "#0D6B2F",
      "subColor": "#5A9A72",
      "order": 4
    }
  ],
  "contrast": {
    "threshold": 0.26,
    "darkText": "#000000",
    "lightText": "#FFFFFF"
  }
}
```

`category` は `title`（五大タイトル） / `exchange`（交流タイトル） / `open` / `other`。`id` は固有で英小文字・数字・ハイフンのみ。大会名も重複不可。`color` / `subColor` は `#RRGGBB`（`#RGB`も入力可）、`order` は1からの連番です。旧JSON（`subColor` や `editionBase` がない形式）も取込可能で、取り込み時にテーマカラーから補完します。JSONが唯一の正本で、JS内に別の大会カラー表をコピーしていません。

## データ出典（2026-10-19時点）

- カラーと日本語名: 既存の [thumbnail](https://github.com/jbsbackgammon/thumbnail/blob/main/index.html)、[tournament](https://github.com/jbsbackgammon/tournament/blob/main/src/model.js)、[overlay](https://github.com/jbsbackgammon/overlay/blob/main/overlay.js) の大会マスタに合わせています。
- 英語表記: `overlay.js` の `titleEnglishPresets` をそのまま採用しています。例: 棋聖戦 = `INVITATIONAL DOUBLES`。名称の対外表記を変更する場合は本管理画面から更新できます。
- 文字色判定: sRGB相対輝度（ガンマ補正）で判定。しきい値は `0.26` に変更し、東京オープン `#009F40` は白文字とします（大阪オープンは黒文字）。既存の `thumbnail` や `overlay` は、参照先を本commonへ切り替えるまでは従来の独立したしきい値を使用します。

### 年度回次の初期値と移行について（v04）

- 2026年（10月時点）: 日本選手権 JBS 第54回 / 盤聖戦 第33期 / 名人戦 第32期 / 王位戦 第33期 / 賽王戦 第8期 / 棋聖戦 第5回 / 女王戦 第3回 / 新鋭戦 第15回（いずれも `JBS ` を冠する）。東京オープン JBS 第2回 / 大阪オープン JBS 第27回 / 名古屋オープン JBS 第5回。
- 2027年: 盤聖戦・賽王戦は2027年7月1日（日本時間）にそれぞれ第34期・第9期へ切替。そのほかは2027年1月1日に+1。年替わりのJSON更新は不要です。
- 入力欄の値を変更したときは、その日時に有効な回次更新年度を基準として保存するため、以降の更新日に加算が続きます。`第○回` / `第○期` が含まれないテキストは年をまたいでも変更しません。
- 旧JSONでは棋聖戦・女王戦・新鋭戦が `title` として扱われていました。回次の新フィールドがない旧JSONから取り込む場合に限り、3大会を `exchange` に自動移行します。その他の既存項目は維持します。

### v05 UI調整と回次の更新日

- 大会一覧の列名を「回次等」に固定（回次の入力内容はアクセス年に応じ自動計算したものを表示）。
- テーマカラー・サブカラー・明るい背景の文字色・暗い背景の文字色、4種類のカラーピッカーを外枠の内側いっぱいまで塗りつぶし、内側の余白・スウォッチの枠線を削除。

- **盤聖戦・賽王戦** は7月1日（日本時間）に更新。2026年1月1日〜6月30日はそれぞれ「JBS 第32期」「JBS 第7期」、**2026年7月1日から**「JBS 第33期」「JBS 第8期」です。2027年7月1日からは「JBS 第34期」「JBS 第9期」になります。
- ほかの大会は毎年1月1日（日本時間）に更新。`editionUpdateMonth` / `editionUpdateDay` を共通JSONに保存します（通常 `1/1`、盤聖戦・賽王戦のみ `7/1`）。
- v04の旧JSONで基準回次が「盤聖戦 JBS 第32期」「賽王戦 JBS 第7期」の場合は、読み込み時に新しい7月更新ルールへ自動移行します。

### v06 オープン3大会の回次

2026年の基準回次を次のとおり設定しました。

| 大会名 | 2026年 | 2027年 | 更新日 |
|---|---|---|---|
| 東京オープン | JBS 第2回 | JBS 第3回 | 毎年1月1日（JST） |
| 大阪オープン | JBS 第27回 | JBS 第28回 | 毎年1月1日（JST） |
| 名古屋オープン | JBS 第5回 | JBS 第6回 | 毎年1月1日（JST） |

設定は `data/brand.json` に保存しています。`brand.js` の `EDITIONS_2026` にも旧形式JSON取込時の初期値として追加しました。すでに手動編集された回次は保持されます。

## 保存設定・出力ファイルの共通命名規則（v1）

すべてのJBS運営ツールで同じ区切り方を使うための**正本**は `naming.js` です。各ツールで区切り文字やフォーマット処理を再実装せず、同ファイルを参照します。HTMLから通常のscriptタグで読み込める依存関係のない共通関数です。

```html
<script src="https://jbsbackgammon.github.io/common/naming.js?v=1"></script>
```

| 用途 | 共通API | 出力形式 |
| --- | --- | --- |
| 設定呼出一覧 | `JBSNaming.formatSavedLabel(details)` | `YYYY-MM-DD HH:mm:ss・回次等_大会名_試合名_上選手-下選手` |
| JSON出力 | `JBSNaming.makeFileName({prefix, ...details})` | `ツール名_回次等_大会名_試合名_上選手-下選手.json` |
| その他ファイル出力 | `JBSNaming.makeFileName({prefix, extension, ...details})` | 拡張子を `png` 等に切り替え可能 |
| イベント表示名 | `JBSNaming.formatEventName(details)` | `回次等_大会名_試合名_上選手-下選手` |

```js
const details = {
  edition: "JBS 第15回",
  title: "新鋭戦",
  round: "決勝",
  topName: "Benjamin Friesen",
  bottomName: "Jay Bidal"
};
JBSNaming.makeFileName({ prefix: "配信盤面", ...details });
// 配信盤面_JBS 第15回_新鋭戦_決勝_Benjamin Friesen-Jay Bidal.json

JBSNaming.formatSavedLabel({
  savedAt: new Date(), ...details
});
// 2026-11-17 14:49:00・JBS 第15回_新鋭戦_決勝_Benjamin Friesen-Jay Bidal
```

- 区切りは日時と設定の間だけ「`・`」、大会の各要素間は「`_`」、上・下選手間は「`-`」
- 日時は閲覧ブラウザのローカル時間・秒まで。欠落した大会項目や未入力の選手名には余分な区切りを入れない
- ファイル名ではOSで使用できない `/ \\ : * ? " < > |` と制御文字を `-` に置換。表示一覧は元の文字列を維持する
- 各ツールは `prefix` だけを変更する。例：`配信盤面`、`トーナメント`
- 今後の運営ツールも、このAPIを使って同じ規則で一覧表示・JSON/画像出力を行う
- GitHub Actionsでは `node scripts/check-naming.cjs` により命名ルールの互換性を検証する

## 共通UIデザインシステム（v46）

- 共通CSS：`https://jbsbackgammon.github.io/common/ui.css?v=46`
- 編集UIでは `class="jbsui"` を持つ要素の内側に共通クラスを配置。配信盤面・大会テーマ・各ツール固有のレイアウトは共通化しない
- 変数の定義順は color → font → height → width → size（角丸含む）→ space → opacity → shadow
- 名前は分類を先頭にする。例：`--height-input`、`--width-preset-select`、`--font-size-14`、`--shadow`

### カラーパレット（6色）

色相215°・彩度25%で統一し、明度のみ6段階に分ける。用途別の中間変数を重複定義せず、利用箇所から直接参照する。

| 変数 | 値 | 用途 |
| --- | --- | --- |
| `--color-25` | `hsl(215 25% 25%)` | 基本文字・主要ボタン |
| `--color-45` | `hsl(215 25% 45%)` | 補助文字・ラベル |
| `--color-60` | `hsl(215 25% 60%)` | 操作中の枠線・キーボードフォーカス |
| `--color-85` | `hsl(215 25% 85%)` | 通常の操作枠線・ボタンのホバー背景 |
| `--color-95` | `hsl(215 25% 95%)` | 薄い背景・区切り線 |
| `--color-100` | `hsl(215 25% 100%)` | 白背景 |

旧 `--color-20`、`--color-40`、`--color-80`、`--color-90` は廃止。利用ツールは新しい変数に直接移行する。

### 共通変数と部品

| 分類 | CSS変数 |
| --- | --- |
| font | `--font-family`、`--font-size-12/14/16/20/24`、`--font-weight-normal/action` |
| height | `--height-input`、`--height-button`、`--height-label` |
| width | `--width-preset-select`、`--width-border`、`--width-focus-ring` |
| size・角丸 | `--size-checkbox`、`--size-swatch`、`--radius` |
| space | `--space-4/8/12/16/24` |
| opacity | `--opacity`（0.5）、`--alpha-dialog-backdrop`（50%） |
| shadow | `--shadow`（0 6px 12px、基本文字色を20%で混合） |

- 入力欄・ボタンは高さ36px、通常枠線1px、角丸6px。選択プリセットの左側は80px
- プルダウンの展開一覧（`option`）は白背景・基本文字色・14pxに統一（「選択▼」と同じ）。閉じたプルダウンの文字サイズ・背景・hover状態は変更しない
- `jbsui-field`、`jbsui-select`、`jbsui-preset-input`：入力・プルダウンの共通外観と操作状態
- `jbsui-color-control`、`jbsui-color-swatch`、`jbsui-hex-input`：カラー入力とプレビュー
- `jbsui-button`、`jbsui-button--primary`、`jbsui-check`、`jbsui-divider`：操作要素。通常ボタン・主要ボタンともに文字サイズ14pxで統一
- `jbsui-button--primary-action`：主要操作ボタンの最小横幅170px・左右24pxを共通化
- `jbsui-panel`、`jbsui-actions`、`jbsui-grid--2/3/4/5`：編集画面の共通レイアウト。操作エリア側の余白・列間隔・レスポンシブ切替をツールごとに再定義しない
- 編集パネルの基準間隔は overlay に統一：上下16px・左右24px、行間8px、同一行の項目間16px、操作ボタンの横間隔12px
- `jbsui-tool-page`、`jbsui-preview`、`jbsui-preview-shell`、`jbsui-canvas-preview`：ページ背景・全幅操作エリア・中央寄せプレビュー・Canvas表示を共通化し、ページ固有CSSを不要にする
- `jbsui-combo-input`、`jbsui-combo-menu`、`jbsui-file-picker`、`jbsui-popover-menu`：候補入力・ファイル選択・設定メニューの共通部品
- `jbsui-preset-input--detail`：選択＋主入力＋補助入力を1行に配置。補助入力に独立見出しを置かない場合に使用
- `jbsui-settings-dialog`、`jbsui-saved-settings`、`jbsui-saved-setting`、`jbsui-save-complete-dialog`：設定呼出一覧と2秒の保存完了表示を共通化
- `jbsui-player-fields`、`jbsui-player-field`、`jbsui-player-entry-row`、`jbsui-player-photo-picker`：英語表示時の選手入力を共通化。写真＋選択＋日本語名と英語名を1行に配置
- `jbsui-dialog`、`jbsui-dialog-head`、`jbsui-dialog-close`：ダイアログ
- `--shadow` はダイアログとoverlayの編集プレビューで使用。主要ボタンに影は付けない

共通CSSではフォーカス外枠（3px）は `html[data-jbsui-keyboard-focus]` と `:focus-visible` の組み合わせで表示する。配信盤面作成ツール側のJavaScriptは、Tab操作時のみこの属性を付け、ポインター操作時に解除する。

### 文字色の自動判定（ツール共通CSS）

背景色のsRGB相対輝度に基づく白文字・黒文字の判定は `brand.js` の `JBSBrand.getTextColor()` が担当します。CSS単体では任意の背景色の輝度判定を行わず、共通CSS `.jbsui-auto-contrast` が計算後の表示を担当します。しきい値 `0.26` と文字色は `data/brand.json` が正本です。

```html
<link rel="stylesheet" href="https://jbsbackgammon.github.io/common/ui.css">
<script src="https://jbsbackgammon.github.io/common/brand.js"></script>
<div class="jbsui"><div id="banner">大会名</div></div>
<script>
  JBSBrand.load().then(() => {
    JBSBrand.applyContrast(document.getElementById('banner'), '#009F40');
  });
</script>
```

`JBSBrand.applyContrast()` はCSSカスタムプロパティ `--jbsui-contrast-background` と `--jbsui-contrast-text` を設定し、`.jbsui-auto-contrast` を付与します。大会マスタ、既存API、カラー定義は変更しません。

### 使用例

```html
<link rel="stylesheet" href="https://jbsbackgammon.github.io/common/ui.css?v=46">
<aside class="jbsui">
  <div class="jbsui-field">
    <label for="name">名前</label><input id="name">
  </div>
  <div class="jbsui-field">
    <label for="round">試合名</label>
    <div class="jbsui-preset-input">
      <select aria-label="候補"><option>選択</option></select>
      <input id="round">
    </div>
  </div>
  <button class="jbsui-button" type="button">保存</button>
</aside>
```

大会テーマカラーと回次は `brand.js` / `data/brand.json` で別管理する。編集画面固有の列幅や最大サイズはツール側CSSに残し、共通の値を再定義しない。
