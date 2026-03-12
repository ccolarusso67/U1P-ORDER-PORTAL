#!/usr/bin/perl
use strict;
use warnings;
use IO::Socket::INET;
use File::Basename;
use POSIX qw();

$SIG{PIPE} = 'IGNORE';

my $port    = $ENV{PORT} || 3002;
my $root    = dirname(__FILE__);
my $default = "order_form.html";

my %mime = (
    html  => "text/html; charset=utf-8",
    css   => "text/css; charset=utf-8",
    js    => "application/javascript",
    json  => "application/json",
    png   => "image/png",
    jpg   => "image/jpeg",
    jpeg  => "image/jpeg",
    svg   => "image/svg+xml",
    ico   => "image/x-icon",
    woff2 => "font/woff2",
    woff  => "font/woff",
    ttf   => "font/ttf",
    pdf   => "application/pdf",
);

my $server = IO::Socket::INET->new(
    LocalPort => $port,
    Type      => SOCK_STREAM,
    Reuse     => 1,
    Listen    => 10,
) or die "Cannot bind to port $port: $!\n";

print "Serving at http://localhost:$port/ (root: $root)\n";
$| = 1;

while (my $client = $server->accept()) {
    my $request = "";
    while (my $line = <$client>) {
        $request .= $line;
        last if $line eq "\r\n";
    }

    my ($method, $path) = $request =~ /^(\w+)\s+(\S+)/;
    $path ||= "/";
    $path = "/$default" if $path eq "/" || $path eq "";
    $path =~ s/\?.*//;
    $path =~ s/\.\.//g;
    $path =~ s|//+|/|g;

    my $file = $root . "/" . $path;
    $file =~ s|/+|/|g;

    if (-f $file) {
        open(my $fh, "<:raw", $file) or do {
            print $client "HTTP/1.1 500 Internal Server Error\r\nContent-Length: 5\r\n\r\nError";
            close($client); next;
        };
        local $/;
        my $body = <$fh>;
        close($fh);

        my ($ext) = $file =~ /\.([^.]+)$/;
        $ext = lc($ext // "");
        my $ct = $mime{$ext} // "application/octet-stream";
        my $len = length($body);

        print $client "HTTP/1.1 200 OK\r\nContent-Type: $ct\r\nContent-Length: $len\r\nConnection: close\r\n\r\n$body";
    } else {
        my $body = "404 - Not Found: $path";
        my $len  = length($body);
        print $client "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\nContent-Length: $len\r\nConnection: close\r\n\r\n$body";
    }

    close($client);
}
