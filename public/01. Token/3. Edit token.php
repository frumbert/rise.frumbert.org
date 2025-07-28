<?php
  $token = $_SESSION['token'];
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
        $_SESSION['token'] = $token;
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
    return;
  }
?>

<h2>Edit Token</h2>
<p>You can recreate the list of domains a token authorizes. You need to supply the password you used when creating the token in order for your changes to be applied. If you can't remember the password, there's no way to edit the token (or get the password back).</p>
<form method="POST">
  Token:<br>
  <input type="text" name="token" size="60" required value="<?php echo $token; ?>"><br><br>
  Password:<br>
  <input type="password" name="password" size="30" required><br><br>
  Allowed Domains (host name only, one per line):<br>
  <textarea name="domains" rows="5" cols="60" required>
articulateusercontent.com
360.articulate.com
rise.articulate.com
</textarea><br><br>
  <button type="submit">Save changes</button>
</form>