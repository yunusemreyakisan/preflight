class Preflight < Formula
  desc "CLI-first App Store submission risk engine"
  homepage "https://github.com/yunusemreyakisan/preflight"
  license "MIT"
  url "https://registry.npmjs.org/@yakisan/preflight/-/preflight-0.2.0.tgz"
  sha256 "945edbcb3f804b8f30d18854defde77ae7b39dedb8f98ee42f6111b2613190df"
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
