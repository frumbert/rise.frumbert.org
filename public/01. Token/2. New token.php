<?php
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

      $_SESSION['token'] = $token;

      echo "<h2>Token Created</h2><p><b>Token:</b> <code>$token</code></p>";
      echo "<p>Add this to the Mighty <em>Interactive HTML</em> custom javascript field:</p>";
      echo "<pre>window.riseSCORMBridgeConfig = {\n  token: \"$token\",\n question: \"Ask your question here...\"\n};\n</pre>";

    } else {
      echo "<p>Something went wrong storing the token.</p>";
    }

    return;
  }
?>

<h2>Create New Token</h2>
<p>A token authorizes the following domains. You can re-use domains in other tokens too, and you can have as many domains per token as you like. Adding a password (optional) lets you edit the list of domains later on.</p>
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
  <button type="submit">Generate Token</button>
</form>