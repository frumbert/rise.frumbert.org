<?php

require_once('../app.php'); // classes and functions
define("BASE_URL", 'https://rise.frumbert.org'); // used to report public data url

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: HEAD, POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Pragma');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$Action = new UrlMatcher('route'); // matches $_GET param set in .htaccess
$website = new Website(__FILE__, $Action->Args()); // context starts where this file is

// yeah, this is my 'router' 🤣
switch ($Action->Match()) {
    case "GET /":
    case "GET /article":
      $website->SetTemplate('home');
      $website->FindByName("home");
      renderPage($Action->Args());
      break;

    case "GET /article/*":
    case "POST /article/*": // articles can have php which can do postbacks
      $website->SetTemplate('article');
      $website->FindBySlug($Action->Args()[0]);
      renderPage($Action->Args());
      break;

    case "POST /generate":
      echo handleGenerate();
      break;

    case "POST /view":
      echo handleView();
      break;

    default:
      if (preg_match('/^([a-f0-9]{32})\.html$/i', $Action->Raw(), $matches)) {
        $hash = $matches[1];
        $storage = new S3Storage();
        $html = $storage->read("data/$hash.html");
        if ($html === null || $html === false) {
          http_response_code(404);
          echo "Page not found";
        } else {
          header('Content-Type: text/html');
          echo $html;
        }
      } else {
        http_response_code(418);
        echo "I'm a teapot.";
      }
}

function renderPage() {  
  global $website;
  $website->AddStyle("https://unpkg.com/@highlightjs/cdn-assets@11.11.1/styles/github.min.css");
  $website->AddScript("https://unpkg.com/@highlightjs/cdn-assets@11.11.1/highlight.min.js");
  $website->AddInlineScript("hljs.highlightAll();");
  list($template, $page_title, $navbar, $article, $footer, $styles, $scripts) = $website->Prepare();
  $website->Render($template, [
    "{{page_title}}" => $page_title,
    "{{navbar}}" => $navbar,
    "{{article}}" => $article,
    "{{footer}}" => $footer,
    "{{styles}}" => $styles,
    "{{scripts}}" => $scripts,  
  ]);
}

function handleGenerate() {
  $security = new TokenValidator();
  if (!$security->CheckToken()) {
    http_response_code(403);
    echo $security->Reason();;
    exit;
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
  $filename ="data/{$hash}.html";

  $html = "<!DOCTYPE html><html><head><meta charset='UTF-8'>";
  $html .= "<style>body{font-family:sans-serif;}header{font-style:italic}</style>";
  $html .= "</head><body><header>" . Wrap($question) . "</header>";
  $html .= "<main>" . Wrap($content) . "</main>";
  StorageIO::Write($filename, $html . "</body></html>");

  header('Content-Type: application/json');
  echo json_encode(["url" => BASE_URL . "/{$hash}.html"]);
}

// === Lookup entry ===
function handleView() {
  $security = new TokenValidator();
  if (!$security->CheckToken()) {
    http_response_code(403);
    echo $security->Reason();
    exit;
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
  $filename = "data/$hash.html";

  http_response_code(200);
  header('Content-Type: text/html');
  echo StorageIO::Read($filename, '');
}