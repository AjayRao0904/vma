# AWS Deployment Plan - Video Music Assistant

## 📋 Architecture Overview

Based on your architecture diagram, we'll deploy:

1. **Frontend** - Next.js app on EC2 with Auto Scaling
2. **API Backend** - Next.js API routes (same EC2 instance)
3. **Worker Service** - Separate EC2 for background job processing
4. **Database** - Amazon RDS (PostgreSQL)
5. **Storage** - Amazon S3 for videos, scenes, and audio
6. **Queue** - Amazon SQS for job processing
7. **Logging** - CloudWatch Logs (already integrated)
8. **Secrets** - AWS Secrets Manager

---

## 🎯 Deployment Steps

### Phase 1: AWS Account Setup & Prerequisites
- [ ] AWS Account with billing enabled
- [ ] AWS CLI installed and configured locally
- [ ] IAM user with Admin access
- [ ] Google OAuth credentials (Client ID & Secret)

### Phase 2: Network Infrastructure (VPC)
- [ ] Create VPC with public and private subnets
- [ ] Configure Internet Gateway
- [ ] Set up Route Tables
- [ ] Create Security Groups

### Phase 3: Database Setup (RDS)
- [ ] Create RDS PostgreSQL instance
- [ ] Configure security groups for database access
- [ ] Run schema migration
- [ ] Set up automated backups

### Phase 4: Storage Setup (S3)
- [ ] Create S3 bucket for video/audio storage
- [ ] Configure bucket policies and CORS
- [ ] Set up lifecycle policies (optional)

### Phase 5: Queue Setup (SQS)
- [ ] Create SQS queue for background jobs
- [ ] Configure dead-letter queue
- [ ] Set up queue permissions

### Phase 6: Secrets Management
- [ ] Store database credentials in Secrets Manager
- [ ] Store OAuth credentials
- [ ] Store AWS credentials and S3 bucket name

### Phase 7: Application Deployment
- [ ] Create EC2 instances (API Backend + Worker)
- [ ] Install Node.js and dependencies
- [ ] Configure environment variables
- [ ] Set up PM2 or systemd for process management
- [ ] Install and configure Nginx as reverse proxy

### Phase 8: Auto Scaling & Load Balancing
- [ ] Create Application Load Balancer
- [ ] Set up Target Groups
- [ ] Create Auto Scaling Group
- [ ] Configure scaling policies

### Phase 9: CloudWatch Setup
- [ ] Configure CloudWatch Logs (already integrated in code)
- [ ] Set up CloudWatch Alarms
- [ ] Create dashboards for monitoring

### Phase 10: Domain & SSL
- [ ] Register domain or use existing
- [ ] Configure Route 53 (or your DNS provider)
- [ ] Request SSL certificate (ACM)
- [ ] Attach certificate to Load Balancer

---

## 💰 Estimated Monthly Costs (AWS)

| Service | Configuration | Est. Cost |
|---------|--------------|-----------|
| EC2 (t3.medium x2) | 2 instances | ~$60/mo |
| RDS (db.t3.small) | PostgreSQL | ~$30/mo |
| S3 | 100GB + requests | ~$5-10/mo |
| SQS | 1M requests | Free tier |
| CloudWatch Logs | 5GB ingestion | ~$2.50/mo |
| Load Balancer | ALB | ~$20/mo |
| Data Transfer | Out to internet | ~$10-30/mo |
| **Total** | | **~$127-152/mo** |

*Note: Costs vary based on actual usage. Start small and scale up.*

---

## 🚀 Quick Deployment Checklist

### Before You Start
- [ ] AWS account ready
- [ ] Credit card added to AWS
- [ ] Local development environment working
- [ ] Code committed to Git repository
- [ ] Environment variables documented

### Critical Information to Gather
- [ ] Google OAuth Client ID & Secret
- [ ] Strong password for RDS
- [ ] Unique S3 bucket name (globally unique)
- [ ] Domain name (if available)

---

## ⚠️ Important Notes

1. **Security First**: Never commit `.env` files with real credentials
2. **Start Small**: Begin with smaller instance types, scale later
3. **Enable MFA**: Protect your AWS root account
4. **Regular Backups**: Enable RDS automated backups (30 days)
5. **Cost Monitoring**: Set up billing alarms in AWS
6. **CloudWatch Logging**: Already integrated - logs will flow automatically

---

## 📊 Service Dependencies

```
Internet
   ↓
Route 53 (DNS)
   ↓
Application Load Balancer
   ↓
EC2 Auto Scaling Group (Frontend + API)
   ↓
├─→ RDS PostgreSQL
├─→ S3 Bucket
├─→ SQS Queue → EC2 Worker
├─→ CloudWatch Logs
└─→ Secrets Manager
```

---

## 🔄 Next Steps

After reviewing this plan, proceed to:
- **AWS_DEPLOYMENT_GUIDE.md** - Step-by-step AWS Console instructions
- Test each component individually
- Set up monitoring and alerts
- Configure CI/CD (optional, future enhancement)

---

**Ready to deploy?** Open `AWS_DEPLOYMENT_GUIDE.md` for detailed UI walkthrough.
