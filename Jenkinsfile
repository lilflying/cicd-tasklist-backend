pipeline {
    agent any

    triggers {
        pollSCM('H/5 * * * *')
    }

    environment {
        DOCKERHUB_CREDENTIALS = 'dockerhub-creds'
        DOCKER_IMAGE = 'maberger38/tasklist-backend'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        SONAR_PROJECT_KEY = 'martin-tasklist-backend-exam'
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
                withCredentials([string(credentialsId: 'sonarqube-token-martin', variable: 'SONAR_TOKEN')]) {
                    sh '''
                        npx --yes sonarqube-scanner \
                            -Dsonar.host.url=https://sonarqube.cicd.kits.ext.educentre.fr \
                            -Dsonar.token=$SONAR_TOKEN \
                            -Dsonar.projectKey=$SONAR_PROJECT_KEY \
                            -Dsonar.projectName="Martin TaskList Backend Exam" \
                            -Dsonar.sources=src \
                            -Dsonar.exclusions=src/__tests__/**,**/*.d.ts \
                            -Dsonar.tests=src/__tests__ \
                            -Dsonar.test.inclusions=src/__tests__/**/*.test.ts \
                            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                    '''
                }
            }
        }

        stage('Quality Gate') {
            when {
                expression { fileExists('.scannerwork/report-task.txt') }
            }
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
