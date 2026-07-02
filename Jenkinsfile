pipeline {
    agent any

    triggers {
        pollSCM('H/5 * * * *')
    }

    environment {
        DOCKERHUB_CREDENTIALS = 'dockerhub-creds'
        DOCKER_IMAGE = 'maberger38/tasklist-backend'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        SONAR_PROJECT_KEY = 'tasklist-backend'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                sh 'npm ci'
                sh 'npx prisma generate --schema=prisma/schema.prisma'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'npm run test:coverage'
            }
            post {
                always {
                    junit 'reports/junit.xml'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                script {
                    def scannerHome = tool 'SonarScanner'
                    withSonarQubeEnv('sonarqube-server-1') {
                        sh "${scannerHome}/bin/sonar-scanner"
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: false
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh "docker build -t ${DOCKER_IMAGE}:${IMAGE_TAG} -t ${DOCKER_IMAGE}:latest ."
            }
        }

        stage('Trivy Scan') {
            steps {
                sh "trivy image --exit-code 0 --severity CRITICAL,HIGH --format table ${DOCKER_IMAGE}:${IMAGE_TAG} | tee trivy-report.txt"
            }
        }

        stage('SBOM (SPDX)') {
            steps {
                sh "trivy image --format spdx-json --output sbom-spdx.json ${DOCKER_IMAGE}:${IMAGE_TAG}"
            }
        }

        stage('Docker Push') {
            steps {
                withCredentials([usernamePassword(credentialsId: DOCKERHUB_CREDENTIALS, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
                    sh "docker push ${DOCKER_IMAGE}:${IMAGE_TAG}"
                    sh "docker push ${DOCKER_IMAGE}:latest"
                    sh 'docker logout'
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'coverage/**, reports/**, sbom-spdx.json, trivy-report.txt', allowEmptyArchive: true
        }
    }
}
