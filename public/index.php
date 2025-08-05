<?php

require_once('../app.php'); // classes and functions
define("BASE_URL", 'https://rise.frumbert.org'); // used to report public data url

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: HEAD, POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Pragma');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

session_start();

$Action = new UrlMatcher('route'); // matches $_GET param set in .htaccess
$website = new Website(__FILE__, $Action->Args()); // context starts where this file is

// yeah, this is my 'router' 🤣
switch ($Action->Match()) {
    case "GET /favicon.ico":
      header('Content-Type: image/svg+xml');
      die('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🥔</text></svg>');
    break;

    case "GET /home/*":
      $website->SetTemplate('home');
      $page = $website->FindOther($Action->Args()[0]);
      renderPage($page);
      break;

    case "GET /":
    case "GET /home":
    case "GET /article":
      $website->SetTemplate('home');
      $website->FindByName('home');
      renderPage();
      break;

    case "GET /articles/*":
    case "GET /article/*":
    case "POST /article/*": // articles can have php which can do postbacks
      $website->SetTemplate('article');
      $website->FindBySlug($Action->Args()[0]);
      renderPage();
      break;

    case "POST /generate":
      echo handleGenerate();
      break;

    case "POST /view":
      echo handleView();
      break;

    case "GET /dl/*":
      $dir = base64_decode($Action->Args()[0]);
      $dir = str_replace('../','/hax/',$dir);
      $zipFile = "";
      if (file_exists($dir.'/index.html')) {
        $content = file_get_contents($dir.'/index.html');
        $content = preg_replace('/<script>([\s\S]*?)<\/script>/i', '', $content, 1);
        $content = str_replace(hex2bin('20200A0A'),"", $content); // two spaces two line feeds
        $zipFile = zipFolder($dir,$content);
      } else {
        error_log($dir);
      }
      if ($zipFile > "") {
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="download.zip"');
        header('Content-Length: ' . filesize($zipFile));
        readfile($zipFile);
        unlink($zipFile);
        exit;
      }
      break;

    default:
      if (preg_match('/^([a-f0-9]{32})\.(html|json)$/i', $Action->Raw(), $matches)) {
        $hash = $matches[1]; $extension = $matches[2];
        $storage = new S3Storage();
        $html = $storage->read("data/$hash.$extension");
        if ($html === null || $html === false) {
          http_response_code(404);
          echo "Page not found";
        } else {
          if ($extension === "json") {
            header('Content-Type: application/json');
          } else {
            header('Content-Type: text/html');
          }
          echo $html;
        }
      } else {
        http_response_code(418);
        echo "I'm a teapot.";
      }
}

function renderPage($page = '') {  
  global $website;
  $website->AddStyle("https://unpkg.com/@highlightjs/cdn-assets@11.11.1/styles/github.min.css");
  $website->AddScript("https://unpkg.com/@highlightjs/cdn-assets@11.11.1/highlight.min.js");
  $website->AddInlineScript("hljs.highlightAll();");
  list($template, $page_title, $navbar, $article, $footer, $styles, $scripts, $tiles, $tabs, $breadcrumb) = $website->Prepare([$page]);
  $website->Render($template, [
    "{{page_title}}" => $page_title,
    "{{navbar}}" => $navbar,
    "{{article}}" => $article,
    "{{footer}}" => $footer,
    "{{styles}}" => $styles,
    "{{scripts}}" => $scripts,
    "{{navtiles}}" => $tiles,
    "{{tabs}}" => $tabs,
    "{{breadcrumb}}" => $breadcrumb
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
  $extension = $data['type'] ?? 'html';
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
  $filename ="data/{$hash}.{$extension}";

  if ($extension === "json") {
    StorageIO::Write($filename, $content);
  } else {
    $html = "<!DOCTYPE html><html><head><meta charset='UTF-8'>";
    $html .= "<style>body{font-family:sans-serif;}header{font-style:italic}</style>";
    $html .= "</head><body><header>" . Wrap($question) . "</header>";
    $html .= "<main>" . Wrap($content) . "</main>";
    StorageIO::Write($filename, $html . "</body></html>");
  }

  header('Content-Type: application/json');
  echo json_encode(["url" => BASE_URL . "/{$hash}.{$extension}"]);
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
  $extension = $data['type'] ?? 'html';
  $course = $data['course'] ?? '';
  $learner = $data['learner'] ?? '';
  $interaction = $data['interaction'] ?? '';
  $key = $data['key'] ?? '';

  if (!$course || !$learner || !$interaction) {
    http_response_code(400); echo "Missing fields"; exit;
  }

  $hashInput = $course . "|" . $learner . "|" . $interaction . "|" . $key;
  $hash = substr(hash('sha256', $hashInput), 0, 32); // safe hash
  $filename = "data/$hash.{$extension}";

  http_response_code(200);
  if ($extension === "json") {
    header('Content-Type: application/json');
    echo StorageIO::Read($filename, '{}');
  } else {
    header('Content-Type: text/html');
    echo StorageIO::Read($filename, '');
  }
}

function zipFolder($path, $index = '') {
  $zip = new ZipArchive();
  $zipFile = tempnam(sys_get_temp_dir(), 'zip');
  unlink($zipFile);
  $zip->open($zipFile, ZipArchive::CREATE);
  $rootPath = rtrim(realpath($path), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
  $files = new RecursiveIteratorIterator(
      new RecursiveDirectoryIterator($rootPath, RecursiveDirectoryIterator::SKIP_DOTS)
  );
  foreach ($files as $file) {
      $filePath = $file->getRealPath();
      $localName = substr($filePath, strlen($rootPath));
      if (strpos(basename($localName),'.')===0) continue;
      if (strtolower($localName) === 'index.html' && !empty($index)) {
          $zip->addFromString($localName, $index);
      } else {
          $zip->addFile($filePath, $localName);
      }
  }
  $zip->close();
  return $zipFile;
}