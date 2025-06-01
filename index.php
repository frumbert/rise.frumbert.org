<?php
// == CONFIG ==
define("TOKEN_DIR", __DIR__ . "/tokens");
define("DATA_DIR", __DIR__ . "/data");
define("BASE_URL", "https://rise.frumbert.org/data/"); // Must match hosting domain

if (!file_exists(TOKEN_DIR)) mkdir(TOKEN_DIR, 0777, true);
if (!file_exists(DATA_DIR)) mkdir(DATA_DIR, 0777, true);

// === Handle GET /?new_token (UI) ===
if (isset($_GET['new_token'])) {
  showTokenForm();
  exit;
}

if (empty($_GET) && $_SERVER['REQUEST_METHOD'] === 'GET') {
  showStartup();
  exit;
}

// === Handle POST /generate ===
if ($_SERVER['REQUEST_METHOD'] === 'POST' && strpos($_SERVER['REQUEST_URI'], 'generate') !== false) {
  handleGenerate();
  exit;
}

// === HTML Form for Token Creation ===
function showTokenForm() {
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $domains = array_map('trim', explode(",", $_POST['domains'] ?? ''));
    $note = $_POST['note'] ?? '';
    $token = bin2hex(random_bytes(16));
    $data = [
      "created" => date('c'),
      "allowed_domains" => $domains,
      "note" => $note
    ];
    file_put_contents(TOKEN_DIR . "/{$token}.json", json_encode($data, JSON_PRETTY_PRINT));
    echo "<h2>Token Created</h2><p><b>Token:</b> <code>$token</code></p>";
    echo "<p>Add this to your Rise HTML block:</p><pre>&lt;script&gt;\nwindow.riseSCORMBridgeConfig = {\n  token: \"$token\",\n  serverBase: \"https://rise.frumbert.org\"\n};\n&lt;/script&gt;</pre>";
    echo "<p><a href='?new_token'>Create another</a></p>";
    return;
  }

  echo <<<HTML
<h2>Create New Token</h2>
<form method="POST">
  Allowed Domains (comma-separated):<br>
  <input type="text" name="domains" style="width:100%" required><br><br>
  Optional Note:<br>
  <input type="text" name="note" style="width:100%"><br><br>
  <button type="submit">Generate Token</button>
</form>
HTML;
}

// === Main POST handler ===
function handleGenerate() {
  $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (!preg_match('/Bearer (\w+)/', $auth, $matches)) {
    http_response_code(401); echo "Missing or invalid token"; exit;
  }

  $token = $matches[1];
  if (!validateToken($token)) {
    http_response_code(403); echo "Unauthorized"; exit;
  }

  $data = json_decode(file_get_contents("php://input"), true);
  $course = $data['course'] ?? '';
  $learner = $data['learner'] ?? '';
  $interaction = $data['interaction'] ?? '';
  $content = $data['content'] ?? '';
  $key = $data['key'] ?? '';

  if (!$course || !$learner || !$interaction || !$content) {
    http_response_code(400); echo "Missing fields"; exit;
  }

  $hashInput = $course . "|" . $learner . "|" . $interaction . "|" . $key;
  $hash = substr(hash('sha256', $hashInput), 0, 32); // safe hash
  $filename = DATA_DIR . "/{$hash}.html";

  $html = "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body>";
  foreach(explode("\n", $content) as $paragraph) {
      $html .= "<p>" . htmlentities(trim($paragraph)) . "</p>";
  }
  file_put_contents($filename, $html . "</body></html>");

  header('Content-Type: application/json');
  echo json_encode(["url" => BASE_URL . "{$hash}.html"]);
}

// === Validate token + origin ===
function validateToken($token) {
  $file = TOKEN_DIR . "/$token.json";
  if (!file_exists($file)) return false;

  $info = json_decode(file_get_contents($file), true);
  $allowed = $info['allowed_domains'] ?? [];
  $origin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';
  $host = parse_url($origin, PHP_URL_HOST);
  return in_array($host, $allowed, true);
}

function showStartup() {
  echo <<<HTML
<h1>Rise Text-entry interaction</h1>
<p>A way to store long text for SCORM 1.2 and 2004 text-entry interactions.</p>
<ul>
  <li><a href='/iframe/textEntry.zip' download>Download the text-entry interaction</a> - then upload it via Mighty</li>
  <li><a href='/?new_token'>Create new token</a> - then copy the generated code into the Javascript for the interactive html block.</li>
</ul>
HTML;
}

// Example text at 255 characters
// $text = "This is an example of text that is exactly 255 characters long. It demonstrates how many words can typically fit within this limit. As you can see, you can express quite a few complete thoughts and still have room for proper punctuation and spacing.";
