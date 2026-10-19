# JBS ブランド管理（common）

GitHubリポジトリ `jbsbackgammon/common` / ページ名「ブランド管理」。

- 管理画面: https://jbsbackgammon.github.io/common/
- 共通設定（正本）: https://jbsbackgammon.github.io/common/data/brand.json
- ブラウザ共通ライブラリ: https://jbsbackgammon.github.io/common/brand.js

## 初回設置

1. GitHubの `jbsbackgammon` に **public** リポジトリ `common` を作成します（初回時点では未作成）。
2. このZIPを展開し、中のファイル・フォルダをリポジトリ **ルート** にそのままアップロードします。フォルダ `data` も含めてください。
3. GitHubリポジトリの **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main → / (root) → Save** を設定します。
4. 公開後 https://jbsbackgammon.github.io/common/ を開きます。

静的ファイルを `main` にアップロードするだけでPagesが更新されます。独自のGitHub Actionsワークフローは不要です（`ubuntu-latest` やNode.jsの非推奨アノテーションも発生させません）。

## 管理画面の機能

- 大会マスタ: ID（変更不可）、表示順、大会名、英語表記、分類、メインカラーを変更
- 大会の追加と削除
- メインカラーに基づく文字色のプレビュー
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
| `JBSBrand.getColor(nameOrId, fallback)` | メインカラー。未登録の場合は `fallback`（省略時 `null`） |
| `JBSBrand.getTextColor(hex, fallback)` | 現在の共通ルールで前景色を判定。HEX不正時は `fallback` |
| `JBSBrand.getContrast()` | 文字色判定ルールのコピー |
| `JBSBrand.getConfig()` | 共通設定全体のコピー |
| `JBSBrand.validate(object)` | スキーマを検証して正規化した設定のコピーを返す |

**注意:** `load()` 完了前の `getTournament()` は `null` を返します。ブラウザの通信が失敗したときに画面が壊れないよう、各ツールでは独自の既定値（既存マスタ）を残して段階的に移行してください。新しい共通設定の反映には、GitHub PagesにJSONが公開されてからツールを開き直す必要があります。

### 移行対象と維持対象

| 既存ツール | 共通化する値 | ツール内で維持する値 |
| --- | --- | --- |
| thumbnail | `SERIES`、`OPEN_SERIES` のカラー、文字色判定 | サブカラー自動生成、影、画像処理、レイアウト |
| tournament | `TOURNAMENT_MASTERS` の名前とカラー、判定できる文字色 | `TITLE_COLORS`（5大タイトルの装飾）、PDF・PNG描画、トーナメントロジック |
| overlay | `titleThemePresets`、`titleEnglishPresets`、共通文字色判定 | ボードプリセット、パネルカラー、選手配色、描画・配置 |

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
      "color": "#0D6B2F",
      "order": 40
    }
  ],
  "contrast": {
    "threshold": 0.179,
    "darkText": "#000000",
    "lightText": "#FFFFFF"
  }
}
```

`category` は `title` / `open` / `other`。`id` は固有で英小文字・数字・ハイフンのみ。大会名と表示順も重複不可。`color` は `#RRGGBB`（`#RGB`も入力可）、`order` は1以上の整数です。JSONが唯一の正本で、JS内に別の大会カラー表をコピーしていません。

## データ出典（2026-10-19時点）

- カラーと日本語名: 既存の [thumbnail](https://github.com/jbsbackgammon/thumbnail/blob/main/index.html)、[tournament](https://github.com/jbsbackgammon/tournament/blob/main/src/model.js)、[overlay](https://github.com/jbsbackgammon/overlay/blob/main/overlay.js) の大会マスタに合わせています。
- 英語表記: `overlay.js` の `titleEnglishPresets` をそのまま採用しています。例: 棋聖戦 = `INVITATIONAL DOUBLES`。名称の対外表記を変更する場合は本管理画面から更新できます。
- 文字色判定: 既存ツールと同じ sRGB相対輝度（ガンマ補正）と `luminance > 0.179` の条件を使用します。
