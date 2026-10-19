# JBS ブランド管理（common）

GitHubリポジトリ `jbsbackgammon/common` / ページ名「ブランド管理」。

- 管理画面: https://jbsbackgammon.github.io/common/
- 共通設定（正本）: https://jbsbackgammon.github.io/common/data/brand.json
- ブラウザ共通ライブラリ: https://jbsbackgammon.github.io/common/brand.js

## 初回設置

1. `commonv04.zip` は **差分** です。既存の `common` のルートに内容を追加・上書きしてください（`data/brand.json` を含む）。初回設置は全ファイル一式から行います。
2. GitHubリポジトリの **Settings → Pages → Build and deployment → Source: GitHub Actions** を選択してください。**Deploy from a branch は選択しません。**
3. `main` ブランチへのPushで `.github/workflows/deploy.yml` が自動実行され、公開後 https://jbsbackgammon.github.io/common/ で閲覧できます。**Actions → Deploy GitHub Pages → Run workflow** から手動実行も可能です。

### GitHub Actions（v02以降）

- `main` へのPush、および手動実行（`workflow_dispatch`）に対応。ブランド管理画面から `data/brand.json` を保存した場合も、自動で再デプロイされます。
- OSを `ubuntu-24.04` に固定し、`ubuntu-latest` → Ubuntu 26.04 移行アノテーションの対象にならないようにしています。
- `actions/checkout@v6`、`actions/configure-pages@v6`、`actions/upload-pages-artifact@v5`、`actions/deploy-pages@v5` を使用（Node.js 24対応世代）。
- 公開前に `data/brand.json` のJSON構文チェックを行い、公開物を `_site/` に組み立てます。npmやビルドは不要です。
- GitHub Actionsが動くために別途PATは不要です。管理画面からGitHubへ直接**保存**する際だけ、既存どおりFine-grained PATが必要です。
- ZIPをGitHubのWeb画面からアップロードする際は**必ず展開してから** `.github/workflows/deploy.yml` を配置してください。ワークフローファイルはGitHubの管理権限等によりアップロードが制限される場合があります。

## 管理画面の機能

- 大会マスタ: ID（変更不可）、大会名、英語表記、年ごとの回次、分類、メインカラー、サブカラーを変更
- 大会の追加と削除、ドラッグによる並び替え（キーボードの上下矢印キーも対応）。保存順は1,2,3…に連番化
- 表示イメージのセル全体をメインカラーで塗りつぶすプレビュー。メインカラー変更でサブカラーを自動生成（白を32%混合）、その後に個別変更可能
- 分類は五大タイトル (`title`)、交流タイトル (`exchange`)、オープン (`open`)、その他 (`other`)
- 年ごとの回次は「基準年＋基準表示」方式。2026年の初期値から、2027年以降は「第○回」「第○期」の数字を経過年数だけ加算（ページを開き直すか再フォーカスで更新）
- 文字色判定の相対輝度しきい値と白/黒の文字色を管理
- JSON取込・JSON出力
- GitHub APIによる **`data/brand.json` 直接保存**

### 「GitHubに保存」

1. GitHubの Settings → Developer settings → Personal access tokens → Fine-grained tokens でトークンを作成します。
2. **Repository access** は **Only select repositories** → `jbsbackgammon/common` のみ選択してください。
3. **Repository permissions** の **Contents: Read and write** を付与します。組織のトークン利用制限がある場合は承認が必要です。
4. 管理画面で編集後「GitHubに保存」→ PATを入力 →「保存する」。

トークンは保存操作のときだけ `api.github.com` に送信し、ブラウザの保存領域には残しません。GitHub側で他者による変更があれば上書きを拒否します。ブラウザ側の一時編集は、ページを再読み込みすると失われます。

**PATを使わない方法:** 「JSON出力」で生成したJSONファイルを `brand.json` にリネームして GitHub の `data/brand.json` に手動上書きしてください。この場合、管理画面の「同期済み」表示は再読み込み後に更新されます。

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
| `JBSBrand.getEdition(nameOrId, year?)` | 指定年の回次（年省略時は閲覧端末の現在年）。未登録なら `null` |
| `JBSBrand.editionForYear(entry, year?)` | 大会データから指定年の回次を計算（未入力なら空文字） |
| `JBSBrand.getColor(nameOrId, fallback)` | メインカラー。未登録の場合は `fallback`（省略時 `null`） |
| `JBSBrand.getSubColor(nameOrId, fallback)` | サブカラー。未登録の場合は `fallback`（省略時 `null`） |
| `JBSBrand.makeSubColor(mainColor)` | メインカラーに白を32%混ぜたサブカラー初期値 |
| `JBSBrand.getTextColor(hex, fallback)` | 現在の共通ルールで前景色を判定。HEX不正時は `fallback` |
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

各ツールの修正は**本ZIPには含みません**。このリポジトリを先に公開し、各ツールの参照先を切り替える形になります。

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

`category` は `title`（五大タイトル） / `exchange`（交流タイトル） / `open` / `other`。`id` は固有で英小文字・数字・ハイフンのみ。大会名も重複不可。`color` / `subColor` は `#RRGGBB`（`#RGB`も入力可）、`order` は1からの連番です。旧JSON（`subColor` や `editionBase` がない形式）も取込可能で、取り込み時にメインカラーから補完します。JSONが唯一の正本で、JS内に別の大会カラー表をコピーしていません。

## データ出典（2026-10-19時点）

- カラーと日本語名: 既存の [thumbnail](https://github.com/jbsbackgammon/thumbnail/blob/main/index.html)、[tournament](https://github.com/jbsbackgammon/tournament/blob/main/src/model.js)、[overlay](https://github.com/jbsbackgammon/overlay/blob/main/overlay.js) の大会マスタに合わせています。
- 英語表記: `overlay.js` の `titleEnglishPresets` をそのまま採用しています。例: 棋聖戦 = `INVITATIONAL DOUBLES`。名称の対外表記を変更する場合は本管理画面から更新できます。
- 文字色判定: sRGB相対輝度（ガンマ補正）で判定。しきい値は `0.26` に変更し、東京オープン `#009F40` は白文字とします（大阪オープンは黒文字）。既存の `thumbnail` や `overlay` は、参照先を本commonへ切り替えるまでは従来の独立したしきい値を使用します。

### 年度回次の初期値と移行について（v04）

- 2026年: 日本選手権 JBS 第54回 / 盤聖戦 第32期 / 名人戦 第32期 / 王位戦 第33期 / 賽王戦 第7期 / 棋聖戦 第5回 / 女王戦 第3回 / 新鋭戦 第15回（いずれも `JBS ` を冠する）。オープン3大会は未入力。
- 2027年: それぞれ自動的に+1。JSONを年末ごとに更新する必要はありません。
- 入力欄の値を変更したときは、現在表示中の年を新しい基準年として保存するため、翌年以降も加算が続きます。`第○回` / `第○期` が含まれないテキストは年をまたいでも変更しません。
- 旧JSONでは棋聖戦・女王戦・新鋭戦が `title` として扱われていました。回次の新フィールドがない旧JSONから取り込む場合に限り、3大会を `exchange` に自動移行します。その他の既存項目は維持します。
