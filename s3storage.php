<?php

/*
S3 STORAGE DONE MINIMALLY
=========================

$storage = new S3Storage();
bucket & credentials are picked up through environment variables

// Write
$storage->write('pages/page123.html', '<html>...</html>');

// Read
$html = $storage->read('pages/page123.html');
if ($html === null) {
    echo "Not found";
} elseif ($html === false) {
    echo "Error reading file";
} else {
    echo $html;
}

// Exists
if ($storage->exists('pages/page123.html')) {
    echo "File exists.";
}

// delete
if ($storage->delete('pages/page123.html')) {
    echo "Deleted successfully.";
} else {
    echo "Failed to delete.";
}
*/

require 'vendor/autoload.php';

use Aws\S3\S3Client;
use Aws\Exception\AwsException;

class S3Storage {
    private $s3;
    private $bucket;
    private $cacheDir;
    private $cacheTTL;

    public function __construct($cacheTTL = 60) {
        $this->bucket = getenv('AWS_BUCKET');
        $this->cacheDir = sys_get_temp_dir() . '/s3cache/';
        $this->cacheTTL = $cacheTTL;

        if (!is_dir($this->cacheDir)) {
            mkdir($this->cacheDir, 0777, true);
        }

        // didn't implement safety around environment variables because a) needs trust to implement, b) they only error once then you fix them
        $this->s3 = new S3Client([
            'version'     => 'latest',
            'region'      => getenv('AWS_REGION'),
            'credentials' => [
                'key'    => getenv('AWS_ACCESS_KEY_ID'),
                'secret' => getenv('AWS_SECRET_ACCESS_KEY'),
            ],
            'suppress_php_deprecation_warning' => true, // can probably remove this now
        ]);
    }

    public function write($key, $value) {
        try {
            $this->s3->putObject([
                'Bucket' => $this->bucket,
                'Key'    => $key,
                'Body'   => $value,
                'ACL'    => 'private',
            ]);

            // Update local cache
            file_put_contents($this->cachePath($key), $value);
            return true;
        } catch (AwsException $e) {
            error_log("S3 write error: " . $e->getMessage());
            return false;
        }
    }

    public function read($key) {
        $cachePath = $this->cachePath($key);

        if (file_exists($cachePath) && (time() - filemtime($cachePath)) < $this->cacheTTL) {
            return file_get_contents($cachePath);
        }

        try {
            $result = $this->s3->getObject([
                'Bucket' => $this->bucket,
                'Key'    => $key,
            ]);

            $body = (string)$result['Body'];
            file_put_contents($cachePath, $body);
            return $body;
        } catch (AwsException $e) {
            if ($e->getStatusCode() === 404) {
                return null;
            }
            error_log("S3 read error: " . $e->getMessage());
            return false;
        }
    }

    public function exists($key) {
        try {
            $this->s3->headObject([
                'Bucket' => $this->bucket,
                'Key'    => $key,
            ]);
            return true;
        } catch (AwsException $e) {
            return $e->getStatusCode() !== 404 ? false : null;
        }
    }

    public function delete($key) {
        try {
            $this->s3->deleteObject([
                'Bucket' => $this->bucket,
                'Key'    => $key,
            ]);

            // Remove local cache if it exists
            $cachePath = $this->cachePath($key);
            if (file_exists($cachePath)) {
                unlink($cachePath);
            }

            return true;
        } catch (AwsException $e) {
            error_log("S3 delete error: " . $e->getMessage());
            return false;
        }
    }

    private function cachePath($key) {
        return $this->cacheDir . md5($key);
    }
}