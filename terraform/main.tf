provider "aws" {
  region = "us-west-2"
}

resource "aws_security_group" "taskflow_sg" {
  name        = "taskflow-sg"
  description = "Taskflow security group"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 15672
    to_port     = 15672
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_key_pair" "taskflow_key" {
  key_name   = "taskflow-key"
  public_key = file("~/.ssh/taskflow-key.pub")
}

data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  owners = ["099720109477"] # Canonical
}

resource "aws_instance" "app_server" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t3.micro"
  key_name                    = aws_key_pair.taskflow_key.key_name
  vpc_security_group_ids      = [aws_security_group.taskflow_sg.id]
  user_data                   = templatefile("userdata.tpl", {
        username=var.username
      })
  user_data_replace_on_change = true
  tags = {
    Name = "taskflow-instance"
  }
}
