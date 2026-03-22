package main

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
)

const defaultPackageSpec = "@yakisan/preflight@latest"

func main() {
	if _, err := exec.LookPath("node"); err != nil {
		exitWithError("Node.js is required for the Go launcher. Install Node.js 20+ and retry.")
	}

	npmPath, err := exec.LookPath("npm")
	if err != nil {
		exitWithError("npm is required for the Go launcher. Install npm and retry.")
	}

	packageSpec := os.Getenv("PREFLIGHT_NPM_PACKAGE")
	if packageSpec == "" {
		packageSpec = defaultPackageSpec
	}

	args := []string{"exec", "--yes", "--package=" + packageSpec, "--", "preflight"}
	args = append(args, os.Args[1:]...)

	cmd := exec.Command(npmPath, args...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = os.Environ()

	if err := cmd.Run(); err != nil {
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			os.Exit(exitErr.ExitCode())
		}

		exitWithError(fmt.Sprintf("Failed to launch %s via npm exec: %v", packageSpec, err))
	}
}

func exitWithError(message string) {
	fmt.Fprintln(os.Stderr, "preflight-go:", message)
	os.Exit(1)
}
