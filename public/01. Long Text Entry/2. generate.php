<?php
global $Action; // because we are an include, it's in the parent scope

// ooh another case router
$route = $Action->Args()[2] ?? '';
switch ($route) {
  case "new": showTokenForm(); break;
  case "edit": editTokenForm(); break;
  default: showInstructions();
}

function showInstructions() {
  echo <<<HTML
  <h2>Where to get everything you need.</h2>
  <p>Other than Articulate Rise with Mighty, You need to do three things to make this work:</p>
  <ol>
    <li><a href="/article/long-text-entry/2/new/">Generate a new token</a>, which authorizes data and ensures it only comes from your domains.</li>
    <li><a href="/assets/iframe.zip" download>Download the latest ZIP</a>, which is the interaction that you will add to Rise. All the source code is in the zip - it's not compressed or minified so feel free to poke around or make your own modifications.</li>
    <li>Drop in the <code>Initialisation Script</code> into Mighty. You'll get this after you generate a token, and it lets you set options and customise the appearance.</li>
  </ol>
  <p>You can <b>reuse the same token</b> across multiple interactions or even courses - it's just used to validate the domains that can read/store data. Most of the time you'll probably only need one token.</p>
  <p>You might also like to <a href='/article/long-text-entry/2/edit/'>edit an existing token</a>, to modify the domains (if you remember the password). If you can't remember the password, you can't edit.</li>

  <h3>Under the hood</h3>
  <p>Tokens and user data is stored on a private, encrypted S3 Bucket, which needs a specific API key and whole rigmarole to get access to. In my implementation, I set up an Amazon IAM user and policy to handle everything If you choose to host your own server to store your data and want a simple reference implementation as a starting point, check out <a href="/article/long-text-entry/3/">Part 3</a> of this series.</p>
HTML;
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

    $storage = new S3Storage();
    if ($storage->write("tokens/{$token}.json", json_encode($data, JSON_PRETTY_PRINT))) {

      echo "<h2>Token Created</h2><p><b>Token:</b> <code>$token</code></p>";
      echo "<p>Add this to the Mighty <em>Interactive HTML</em> custom javascript field:</p><pre>window.riseSCORMBridgeConfig = {\n  token: \"$token\"\nquestion: \"Ask your question here...\"\n};\n</pre>";
      showScriptHelp();

    } else {
      echo "<p>Something went wrong storing the token.</p>";
    }

    echo "<p><a href='/article/long-text-entry/2'>Start over</a></p>";
    return;
  }

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
  Optional password (needed for editing):<br>
  <input type="password" name="password" size="30"><br><br>
  <button type="submit">Generate Token</button><br><br><a href="/article/long-text-entry/2/">Cancel</a>
</form>
HTML;
}

function editTokenForm() {
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $domains = extractDomains($_POST['domains']);
    $token = $_POST['token'];
    $token_valid = (preg_match('/^[a-f0-9]{32}$/i', $token) === 1);
    $password = $_POST['password'];
    $storage = new S3Storage();

    if (!$token_valid) {
      echo "<h2>Token format not accepted</h2>";
    } else {
      $file = $storage->read("tokens/$token.json");
      if ($file === null) {
        echo "<h2>Missing required details</h2>";
      } else if ($file === false) {
        echo "<h2>Token unreadable (out of date?)</h2>";
      } else {
        $data = json_decode($file);
        if (isset($data->password) && password_verify($password, base64_decode($data->password))) {
          $data->allowed_domains = $domains;
          if ($storage->write("tokens/{$token}.json", json_encode($data, JSON_PRETTY_PRINT))) {
            echo "<h2>Token updated</h2><p>Domains now include:</p><pre>";
            echo implode(PHP_EOL, $domains);
            echo "</pre>";
          } else {
            echo "<h2>Error saving token</h2>";
          }
        } else {
          echo "<h2>Failed to update token</h2>";
        }
      }
    }
    echo "<p><a href='/article/long-text-entry/2/'>Start over</a></p>";
    return;
  }

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
  <p>You can change some styling using custom css variables. Paste these into the custom CSS field and modify as required. </p>
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