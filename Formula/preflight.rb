class Preflight < Formula
  desc "Auto-discovery-first App Store submission risk engine"
  homepage "https://github.com/yunusemreyakisan/preflight"
  license "MIT"
  url "https://registry.npmjs.org/@yakisan/preflight/-/preflight-0.3.0.tgz"
  sha256 "05bc282d6fdd3da29dd113c9bc7a76f424789b307779e3179d95f18e9be483d9"
  head "https://github.com/yunusemreyakisan/preflight.git", branch: "stable"

  depends_on "node"

  def install
    if build.head?
      system "npm", "install"
      system "npm", "run", "build"
    end

    libexec.install "dist"
    prefix.install "LICENSE", "README.md"

    (bin/"preflight").write <<~EOS
      #!/bin/bash
      exec "#{Formula["node"].opt_bin}/node" "#{libexec}/dist/cli.js" "$@"
    EOS
  end

  test do
    output = shell_output("#{bin}/preflight rules --json")
    assert_match "\"rules\"", output
  end
end
