class Preflight < Formula
  desc "CLI for detecting App Store submission risk from local iOS project files"
  homepage "https://github.com/yunusemreyakisan/preflight"
  license "MIT"
  url "https://registry.npmjs.org/@yakisan/preflight/-/preflight-0.3.1.tgz"
  sha256 "336dea4d9fdf3d43fe1a40574e5325b8d4d124e853d4ae6467ead3a254ac2565"
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
