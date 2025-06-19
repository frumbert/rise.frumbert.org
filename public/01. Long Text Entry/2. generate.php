<?php
global $Action; // because we are an include, it's in the parent scope

// ooh another case router
$route = $Action->Args()[2] ?? '';
switch ($route) {
  case "new": showTokenForm(); break;
  case "edit": editTokenForm(); showBackButton(); break;
  case "help": showScriptHelp(); showBackButton(); break;
  default: showInstructions($AbsolutePath);
}

function showBackButton() {
  echo "<p><a href='/article/long-text-entry/2/'>Back</a>";
}

function showInstructions($AbsolutePath) {
  echo <<<HTML
  <h2>Where to get everything you need.</h2>
  <p>Other than Articulate Rise with Mighty, You need to do three things to make this work:</p>
  <ol>
    <li><a href="/article/long-text-entry/2/new/">Generate a new token</a>, which authorizes data and ensures it only comes from your domains.</li>
    <li><a href="{$AbsolutePath}iframe/Archive.zip" download>Download the latest ZIP</a>, which is the interaction that you will add to Rise. All the source code is in the zip - it's not compressed or minified so feel free to poke around or make your own modifications.</li>
    <li>Drop in the <code>Initialisation Script</code> into Mighty. You'll get this after you generate a token, and it lets you set options and customise the appearance.</li>
  </ol>
  <p>You can <b>reuse the same token</b> across multiple interactions or even courses - it's just used to validate the domains that can read/store data. Most of the time you'll probably only need one token.</p>
  <p>You might also like to <a href='/article/long-text-entry/2/edit/'>edit an existing token</a>, to modify the domains (if you remember the password). If you can't remember the password, you can't edit.</li>
  <p><a href='/article/long-text-entry/2/help/'>Script options/documentation</a>.</p>
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

    if (StorageIO::Write("tokens/{$token}.json", json_encode($data, JSON_PRETTY_PRINT))) {

      echo "<h2>Token Created</h2><p><b>Token:</b> <code>$token</code></p>";
      echo "<p>Add this to the Mighty <em>Interactive HTML</em> custom javascript field:</p><pre>window.riseSCORMBridgeConfig = {\n  token: \"$token\",\n question: \"Ask your question here...\"\n};\n</pre>";
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

    if (!$token_valid) {
      echo "<h2>Token format not accepted</h2>";
    } else {
      $file = StorageIO::Read("tokens/$token.json");
      if ($file === null) {
        echo "<h2>Missing required details</h2>";
      } else if ($file === false) {
        echo "<h2>Token unreadable (out of date?)</h2>";
      } else {
        $data = json_decode($file);
        if (isset($data->password) && password_verify($password, base64_decode($data->password))) {
          $data->allowed_domains = $domains;
          if (StorageIO::Write("tokens/{$token}.json", json_encode($data, JSON_PRETTY_PRINT))) {
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
  <p>The Javascript to initialise the frame has many optional settable properties.</p>
  <code><pre>
  window.riseSCORMBridgeConfig = {
    token: (your-token-code)
  }</pre></code>
  <p>Note: Properties are case sensitive - ensure they added exactly as shown.</p>
  <table><thead>
    <tr><th>Property</th><th>Type</th><th>Meaning</th><th>Required?</th></tr>
  </thead><tbody>
<tr><td>token</td><td>hash</td><td>Generated authorization token</td><td>Yes</th></tr>
<tr><td>question</td><td>Text/HTML</td><td>Question to show (html ok)</td><td>No, Recommended</td></tr>
<tr><td>feedback</td><td>Text/HTML</td><td>Feedback to show after submission (html ok)</td><td>No</td></tr>
<tr><td>serverBase</td><td>URL</td><td>Defaults to https://rise.frumbert.org, for self-hosted solutions (<a href="https://github.com/frumbert/rise.frumbert.org">documentation</a>)</td><td>No</td></tr>
<tr><td>interactionId</td><td>Text</td></td><td>Scorm interaction id. If omitted, this is built from question text or url</td><td>No</td></tr>
<tr><td>mediaAbove</td><td>URL or HTML</td><td>URL to image (gif,jpg,png,webp), video (mp4,ogg,mov,webm), audio (mp3,wav), embed or html, shown above question text</td><td>No</td></tr>
<tr><td>mediaBelow</td><td>URL or HTML</td><td>URL to image (gif,jpg,png,webp), video (mp4,ogg,mov,webm), audio (mp3,wav), embed or html, shown below question text</td><td>No</td></tr>
<tr><td>required</td><td>Number</td><td>Number of characters required before allowed to save (default: 1)</td><td>No</td></tr>
<tr><td>key</td><td>Text</td><td>Salt for hashing functions, normally empty</td><td>No</td></tr>
<tr><td>placeholder</td><td>Text</td><td>Placeholder text for textarea</td><td>No</td></tr>
  </tbody></table>
  <p>You can change some styling using custom css variables. Add a <code>:root{ }</code> block in Mighty's CSS editor for the interaction instance, and copy in the variables you wish to override. The full list of variables you can use is:</p>
  <pre>
:root {

  --fb-textentry__page-background: transparent;
  --fb-textentry__page-text: #000;
  --fb-textentry__page-font: sans-serif;

  --fb-textentry__container-shadow: 0 .4rem 1.2rem .2rem #0000000d;
  --fb-textentry__container-border: .1rem solid #ddd;
  --fb-textentry__container-background: #fff;
  --fb-textentry__container-radius: 5px;

  --fb-textentry__feedback-background: #f8f8f8;
  --fb-textentry__feedback-alignment: left;
  --fb-textentry__feedback-text: #666;

  --fb-textentry__textarea-border: .1rem solid #ddd;
  --fb-textentry__textarea-background: #fff;
  --fb-textentry__textarea-resize: none;

  --fb-textentry__button-border: none;
  --fb-textentry__button-background: lightgrey;
  --fb-textentry__button-text: #000;
  --fb-textentry__button-radius: 2rem;
  --fb-textentry__button-padding: .75rem 3rem;

}
  </pre>
HTML;
}