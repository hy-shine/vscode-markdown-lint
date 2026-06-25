/**
 * Common shell commands not in highlight.js built_in list.
 * Used for annotating bash/sh/zsh code blocks.
 */
export const SHELL_COMMANDS: readonly string[] = [
  // Package managers
  'npm', 'npx', 'yarn', 'pnpm', 'bun',
  // Version control
  'git',
  // Container & orchestration
  'docker', 'docker-compose', 'podman', 'kubectl', 'helm',
  // Network
  'curl', 'wget',
  // Python
  'pip', 'pip3', 'conda', 'poetry', 'uv',
  // Languages & runtimes
  'node', 'python', 'python3', 'ruby', 'java', 'javac', 'go', 'rustc', 'cargo',
  // Build tools
  'make', 'cmake', 'gradle', 'mvn',
  // Text processing
  'grep', 'egrep', 'fgrep', 'rg',
  // File search
  'find', 'locate',
  // Stream processing
  'awk', 'gawk', 'sed',
  // File viewing
  'more', 'less', 'head', 'tail', 'cat', 'tee',
  // File comparison
  'sort', 'uniq', 'diff', 'patch', 'comm',
  // Archives
  'tar', 'gzip', 'gunzip', 'zip', 'unzip', 'xz', 'bzip2',
  // Remote access
  'ssh', 'scp', 'rsync', 'sftp',
  // Package managers (system)
  'apt', 'apt-get', 'yum', 'dnf', 'brew', 'pacman',
  // System services
  'systemctl', 'service', 'journalctl',
  // Scheduling
  'crontab', 'at',
  // Networking
  'ip', 'ifconfig', 'ping', 'traceroute', 'netstat', 'ss', 'nslookup', 'dig',
  // C/C++ compilers
  'gcc', 'g\\+\\+', 'clang',
  // Editors
  'vim', 'nano', 'emacs',
  // Documentation
  'man', 'info', 'tldr',
  // JSON/YAML processors
  'jq', 'yq',
  // Environment
  'env', 'export', 'source',
] as const;
