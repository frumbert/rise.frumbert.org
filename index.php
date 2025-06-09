<?php
/*
 * index.php
 * "how simple can we make this?"
 *
 * Copyright (c) 2025 frumbert
 * Licensed under the MIT license.
 *
 * The MIT License (MIT)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


// == CONFIG ==
define("TOKEN_DIR", __DIR__ . "/tokens");
define("DATA_DIR", __DIR__ . "/data");
define("BASE_URL", "https://rise.frumbert.org/data/"); // Must match hosting domain

// === Always send CORS headers ===
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: HEAD, POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Pragma');
//    header('Access-Control-Max-Age: 86400'); // 24 hours cache

// === Handle OPTIONS (CORS preflight) ===
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// === check writable locations ===
if (!file_exists(TOKEN_DIR)) mkdir(TOKEN_DIR, 0777, true);
if (!file_exists(DATA_DIR)) mkdir(DATA_DIR, 0777, true);

// === Handle GET /?new_token (UI) ===
if (isset($_GET['new_token'])) {
  showTokenForm();
  exit;
}

// === Handle GET /?edit_token (UI) ===
if (isset($_GET['edit_token'])) {
  editTokenForm();
  exit;
}

// === Home / Startup code (generate a new token) ===
if (empty($_GET) && $_SERVER['REQUEST_METHOD'] === 'GET') {
  showStartup();
  exit;
}

// === Handle POST /generate (saves incoming text )===
if ($_SERVER['REQUEST_METHOD'] === 'POST' && strpos($_SERVER['REQUEST_URI'], 'generate') !== false) {
  handleGenerate();
  exit;
}

// === Handle POST /view (looks up text) ===
if ($_SERVER['REQUEST_METHOD'] === 'POST' && strpos($_SERVER['REQUEST_URI'], 'view') !== false) {
  handleView();
  exit;
}

// === HTML Form for Token Creation ===
function showTokenForm() {
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $domains = extractDomains($_POST['domains'], [
      'articulateusercontent.com',
      '360.articulate.com',
      'rise.articulate.com',
    ]);

    $note = $_POST['note'] ?? '';
    $pw = $_POST['password'] ?? '';
    $token = bin2hex(random_bytes(16));
    $data = [
      "created" => date('c'),
      "allowed_domains" => $domains,
      "note" => $note,
      "password" => base64_encode(password_hash($pw, PASSWORD_BCRYPT)),
    ];
    file_put_contents(TOKEN_DIR . "/{$token}.json", json_encode($data, JSON_PRETTY_PRINT));
    pageStart();
    echo "<h2>Token Created</h2><p><b>Token:</b> <code>$token</code></p>";
    echo "<p>Add this to the Mighty <em>Interactive HTML</em> custom javascript field:</p><pre>window.riseSCORMBridgeConfig = {\n  token: \"$token\"\nquestion: \"Ask your question here...\"\n};\n</pre>";

    showScriptHelp();

    echo "<p><a href='/'>Home</a></p>";
    pageEnd();
    return;
  }

  pageStart();
  echo <<<HTML
<h2>Create New Token</h2>
<form method="POST">
  Allowed Domains (host name only, one per line):<br>
  <textarea name="domains" cols="60" rows="5" required>
articulateusercontent.com
360.articulate.com
rise.articulate.com
</textarea><br><br>
  <input type="hidden" name="note" value="">
  Optional password (for editing):<br>
  <input type="password" name="password" size="30"><br><br>
  <button type="submit">Generate Token</button>
</form>
HTML;
  pageEnd();
}

// === HTML Form for Token Creation ===
function editTokenForm() {
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $domains = extractDomains($_POST['domains']);
    $token = $_POST['token'];
    $token_valid = (preg_match('/^[a-f0-9]{32}$/i', $token) === 1);
    $password = $_POST['password'];
    $file = TOKEN_DIR . "/{$token}.json";
    pageStart();
    if ($token_valid && file_exists($file)) {
      $data = json_decode(file_get_contents($file));
      if (isset($data->password) && password_verify($password, base64_decode($data->password))) {
        $data->allowed_domains = $domains;
        // $data['password'] = password_hash($password, PASSWORD_BCRYPT); // rehash?
        file_put_contents(TOKEN_DIR . "/{$token}.json", json_encode($data, JSON_PRETTY_PRINT));
        echo "<h2>Token updated</h2><p>Domains now include:</p><pre>";
        echo implode(PHP_EOL, $domains);
        echo "</pre>";
      } else {
        echo "<h2>Failed to update token</h2>";
      }
    } else {
      echo "<h2>Missing required details</h2>";
    }
    echo "<p><a href='/'>Home</a></p>";
    pageEnd();
    return;
  }
  pageStart();
  echo <<<HTML
<h2>Edit Token</h2>
<form method="POST">
  Token:<br>
  <input type="text" name="token" size="60" required><br><br>
  Allowed Domains (host name only, one per line):<br>
  <textarea name="domains" rows="5" cols="60" required>
articulateusercontent.com
360.articulate.com
rise.articulate.com
</textarea><br><br>
  Password:<br>
  <input type="password" name="password" size="30" required><br><br>
  <button type="submit">Save changes</button>
</form>
HTML;
  pageEnd();
}

// === Main POST handler ===
function handleGenerate() {
  $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (!preg_match('/Bearer (\w+)/', $auth, $matches)) {
    http_response_code(401); echo "Missing or invalid token (auth = $auth)"; exit;
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
  $question = $data['question'] ?? '';
  $key = $data['key'] ?? '';

  if (!$course || !$learner || !$interaction || !$content) {
    http_response_code(400); echo "Missing fields"; exit;
  }

  $hashInput = $course . "|" . $learner . "|" . $interaction . "|" . $key;
  $hash = substr(hash('sha256', $hashInput), 0, 32); // safe hash
  $filename = DATA_DIR . "/{$hash}.html";

  $html = "<!DOCTYPE html><html><head><meta charset='UTF-8'>";
  $html .= "<style>body{font-family:sans-serif;}header{font-style:italic}</style>";
  $html .= "</head><body><header>" . wrap($question) . "</header>";
  $html .= "<main>" . wrap($content) . "</main>";
  file_put_contents($filename, $html . "</body></html>");

  header('Content-Type: application/json');
  echo json_encode(["url" => BASE_URL . "{$hash}.html"]);
}

// === Lookup entry ===
function handleView() {
  $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (!preg_match('/Bearer (\w+)/', $auth, $matches)) {
    http_response_code(401); echo "Missing or invalid token (auth = $auth)"; exit;
  }

  $token = $matches[1];
  if (!validateToken($token)) {
    http_response_code(403); echo "Unauthorized"; exit;
  }

  $data = json_decode(file_get_contents("php://input"), true);
  $course = $data['course'] ?? '';
  $learner = $data['learner'] ?? '';
  $interaction = $data['interaction'] ?? '';
  $key = $data['key'] ?? '';

  if (!$course || !$learner || !$interaction) {
    http_response_code(400); echo "Missing fields"; exit;
  }

  $hashInput = $course . "|" . $learner . "|" . $interaction . "|" . $key;
  $hash = substr(hash('sha256', $hashInput), 0, 32); // safe hash
  $filename = DATA_DIR . "/{$hash}.html";

  $content = '';
  http_response_code(200);
  header('Content-Type: text/html');
  if (file_exists($filename)) {
    $content = file_get_contents($filename);
  }
  echo $content;
}

// === normalise user input of domains to just the host part
function extractDomains(string $input, array $additional = []): array {
    $lines = explode("\n", $input);
    $domains = [];

    foreach ($lines as $line) {
        $line = trim($line);

        if ($line === '') {
            continue; // skip empty lines
        }

        // Add a scheme if missing to make parse_url work properly
        if (!preg_match('/^https?:\/\//i', $line)) {
            $line = 'http://' . $line;
        }

        $parts = parse_url($line);

        if (!empty($parts['host'])) {
            $domains[] = strtolower($parts['host']);
        }
    }

    // add in any extras we might want
    foreach ($additional as $add) {
      $domains[] = $add;
    }

    // Optional: remove duplicates
    $domains = array_unique($domains);

    // Optional: reindex array
    return array_values($domains);
}

// === wrap and sanitise line breaks into html ===
function wrap($lines, $tag = "p") {
  $html = "";
  foreach(explode("\n", $lines) as $paragraph) {
      $html .= "<" . $tag . ">" . htmlentities(trim($paragraph)) . "</" . $tag . ">";
  }
  return $html;
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
  pageStart();
  echo <<<HTML
<h1>Rise Text-entry interaction</h1>
<p>A way to store long text for SCORM 1.2 and 2004 text-entry interactions.</p>
<p>Scorm 2004 can already store long text (in cmi.interactions), but Scorm 1.2 cannot. This utility is version independant and offers the same experience on both.</p>
<ul>
  <li><a href='/textEntry.zip' download>Download the text-entry interaction</a> - then upload it via Mighty</li>
  <li><a href='/?new_token'>Create new token</a> - then copy the generated code into the Javascript for the interactive html block.</li>
  <li><a href='/?edit_token'>Edit existing token</a> - if you remember the password.</li>
</ul>
<p>You can reuse the same token across multiple interactions or even courses - it's just used to validate the domains that can read/store data.</p>
HTML;
  pageEnd();
}

function showScriptHelp() {
  echo <<<HTML
  <code>window.riseSCORMBridgeConfig = {}</code> has these settable properties. They are case sensitive.
  <table><thead>
    <tr><th>Property</th><th>Type</th><th>Meaning</th><th>Required?</th></tr>
  </thead><tbody>
<tr><td>token</td><td>hash</td><td>Generated authorization token</td><td>Yes</th></tr>
<tr><td>question</td><td>Text/HTML</td><td>Question to show (html ok)</td><td>No, Recommended</td></tr>
<tr><td>feedback</td><td>Text/HTML</td><td>Feedback to show after submission (html ok)</td><td>No</td></tr>
<tr><td>serverBase</td><td>URL</td><td>Defaults to https://rise.frumbert.org, for self-hosted solutions (<a href="https://github.com/frumbert/rise.frumbert.org">documentation</a>)</td><td>No</td></tr>
<tr><td>interactionId</td><td>Text</td></td><td>Scorm interaction id, if empty built from question text or url</td><td>No</td></tr>
<tr><td>mediaAbove</td><td>URL or HTML</td><td>URL to image (gif,jpg,png,webp), video (mp4,ogg,mov,webm), audio (mp3,wav), embed or html, shown above question text</td><td>No</td></tr>
<tr><td>mediaBelow</td><td>URL or HTML</td><td>URL to image (gif,jpg,png,webp), video (mp4,ogg,mov,webm), audio (mp3,wav), embed or html, shown below question text</td><td>No</td></tr>
<tr><td>required</td><td>Number</td><td>Number of characters required before allowed to save (default: 1)</td><td>No</td></tr>
<tr><td>key</td><td>Text</td><td>Salt for hashing functions, normally empty</td><td>No</td></tr>
  </tbody></table>
  <p>You can change some styling using custom css variables. Paste these into the custom CSS field and modify as required.</p>
  <pre>
  :root {
    --page: transparent;    // page background color
    --box: #ffffff;       // box background color
    --text: #000000;      // text color
    --edge: #00000040;    // line / shadow color
    --feedback: #f8f8f0;  // feedback background color
    --radius: 5px;          // box edge smoothness
  }
  </pre>
HTML;
}


// this is garbage, but its all we need.
function pageStart() {
echo <<<HTML
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Rise Text-entry interaction</title>
    <style>
    body { font-family: sans-serif; }
    table,td,th{border-collapse:collapse;border:1px solid silver;}
    </style>
  </head>
  <body>
HTML;
}

function pageEnd() {
echo <<<HTML
  </body>
</html>
HTML;
}
